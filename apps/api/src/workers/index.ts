import 'dotenv/config';
import './email.worker';
import './video.worker';

console.log('🔧 MasterLMS Workers started');
console.log('  ✓ Email worker');
console.log('  ✓ Video worker (FFmpeg HLS transcoding)');
