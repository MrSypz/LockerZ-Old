const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const flaskPath = path.join(__dirname, 'src', 'app.py');

let flaskProcess;

process.send({ type: 'flask-progress', message: 'Flask is initializing...' });


function startFlask() {
    flaskProcess = spawn('python', [flaskPath]);

    flaskProcess.stdout.on('data', (data) => {
        process.send({ type: 'flask-output', data: data.toString() });
    });

    flaskProcess.stderr.on('data', (data) => {
        process.send({ type: 'flask-error', data: data.toString() });
    });

    const checkFlaskReady = () => {
        http.get('http://localhost:5000', (res) => {
            if (res.statusCode === 200) {
                process.send({ type: 'flask-ready', message: 'Flask is ready!' });
            }
        }).on('error', (err) => {
            setTimeout(checkFlaskReady, 1000);
        });
    };

    checkFlaskReady(); // Start checking if Flask is ready
}

process.on('message', (message) => {
    if (message.type === 'shutdown') {
        if (flaskProcess) {
            flaskProcess.kill(); // Kill the Flask process when shutdown is requested
            process.send({ type: 'flask-shutdown', message: 'Flask server has been shut down.' });
        }
    }
});

startFlask();
