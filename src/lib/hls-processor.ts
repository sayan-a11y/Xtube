import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readdir, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { uploadToR2 } from './r2';
import { db } from './db';

const execAsync = promisify(exec);

const QUALITIES = [
  { name: '360p', resolution: '640x360', bitrate: '800k' },
  { name: '480p', resolution: '854x480', bitrate: '1400k' },
  { name: '720p', resolution: '1280x720', bitrate: '2800k' },
  { name: '1080p', resolution: '1920x1080', bitrate: '5000k' },
  { name: '1440p', resolution: '2560x1440', bitrate: '10000k' },
  { name: '2160p', resolution: '3840x2160', bitrate: '20000k' },
];

export async function processVideoHLS(videoId: string, inputBuffer: Buffer) {
  const tempDir = join(process.cwd(), 'tmp-hls', videoId);
  const inputPath = join(tempDir, 'input.mp4');
  
  try {
    await mkdir(tempDir, { recursive: true });
    await writeFile(inputPath, inputBuffer);

    // 1. Generate Variants
    const masterPlaylistLines = ['#EXTM3U', '#EXT-X-VERSION:3'];

    for (const quality of QUALITIES) {
      const variantDir = join(tempDir, quality.name);
      await mkdir(variantDir, { recursive: true });
      
      const variantPlaylist = `${quality.name}.m3u8`;
      const variantPath = join(variantDir, variantPlaylist);

      console.log(`Processing quality: ${quality.name}`);
      
      // FFmpeg command for HLS segmenting and scaling
      // Using libx264 for compatibility, fastpreset for speed
      await execAsync(
        `ffmpeg -i "${inputPath}" -vf "scale=${quality.resolution}" -c:v libx264 -preset veryfast -b:v ${quality.bitrate} -maxrate ${quality.bitrate} -bufsize ${quality.bitrate} -c:a aac -b:a 128k -hls_time 6 -hls_playlist_type prev -hls_segment_filename "${variantDir}/seg_%03d.ts" "${variantPath}"`
      );

      // Add to master playlist
      masterPlaylistLines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(quality.bitrate) * 1000},RESOLUTION=${quality.resolution}`,
        `${quality.name}/${variantPlaylist}`
      );
    }

    const masterPath = join(tempDir, 'master.m3u8');
    await writeFile(masterPath, masterPlaylistLines.join('\n'));

    // 2. Upload everything to R2
    console.log('Uploading HLS package to R2...');
    
    // Upload variants and segments
    for (const quality of QUALITIES) {
      const variantDir = join(tempDir, quality.name);
      const files = await readdir(variantDir);
      for (const file of files) {
        const content = await readFile(join(variantDir, file));
        await uploadToR2(content, `videos/${videoId}/hls/${quality.name}/${file}`, file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T');
      }
    }

    // Upload master
    const masterContent = await readFile(masterPath);
    const masterPublicUrl = await uploadToR2(masterContent, `videos/${videoId}/hls/master.m3u8`, 'application/vnd.apple.mpegurl');

    // 3. Update Database
    await db.video.update({
      where: { id: videoId },
      data: {
        hlsPath: masterPublicUrl,
        status: 'ready'
      }
    });

    console.log(`HLS processing complete for ${videoId}`);
  } catch (error) {
    console.error(`HLS processing failed for ${videoId}:`, error);
    await db.video.update({
      where: { id: videoId },
      data: { status: 'failed' }
    });
  } finally {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}
