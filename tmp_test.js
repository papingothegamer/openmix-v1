const MixerConnection = require('./backend/mixerSync');
const mixer = new MixerConnection('192.168.1.5', 10024);

mixer.on('syncStatus', (status) => {
    console.log('SYNC STATUS:', status);
});

mixer.on('syncComplete', (data) => {
    console.log('SYNC COMPLETE:', data);
    process.exit(0);
});

mixer.requestFullSync('XR18', true);
