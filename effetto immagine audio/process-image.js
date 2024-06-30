const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const meyda = require('meyda');
const { promisify } = require('util');
const { AudioContext } = require('web-audio-api');
const ffmpeg = require('fluent-ffmpeg'); // Importa fluent-ffmpeg

// Function to calculate intensity based on distance from image border
function calculateIntensity(x, y, width, height) {
    const distLeft = x;
    const distRight = width - x - 1;
    const distTop = y;
    const distBottom = height - y - 1;
    const minDistance = Math.min(distLeft, distRight, distTop, distBottom);
    const normalizedDistance = minDistance / Math.min(width, height);
    const intensity = Math.pow(1 - normalizedDistance, 3);
    return Math.floor(intensity * 255);
}

// Function to apply the effect to the image
async function applyEffectToImage(inputPath, outputPath, averageRMS) {
    try {
        const image = await Jimp.read(inputPath);

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const intensity = calculateIntensity(x, y, image.bitmap.width, image.bitmap.height);

            if (averageRMS >= 0.02) {
                const increaseRed = intensity * averageRMS * 1.5 / 0.13;
                this.bitmap.data[idx] = Math.min(this.bitmap.data[idx] + increaseRed, 255);   // Red
            } else if (averageRMS <= 0.007) {
                const increaseGreen = intensity * (0.007 - averageRMS) * 1.5 / 0.009;
                this.bitmap.data[idx + 1] = Math.min(this.bitmap.data[idx + 1] + increaseGreen, 255);   // Green
            }
        });

        await image.writeAsync(outputPath);
        console.log("Immagine modificata e salvata: " + outputPath);
    } catch (error) {
        console.error('Errore durante l\'elaborazione dell\'immagine:', error);
        throw error;
    }
}

// Funzione per convertire un file MP3 in WAV
async function convertMP3toWAV(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .noVideo()
            .audioCodec('pcm_s16le')
            .toFormat('wav')
            .on('end', () => resolve(outputPath))
            .on('error', err => reject(err))
            .save(outputPath);
    });
}

// Funzione per calcolare averageRMS da un file audio WAV
async function calculateAverageRMS(audioPath) {
    // Converti il file MP3 in WAV
    const wavPath = `${audioPath}.wav`;
    await convertMP3toWAV(audioPath, wavPath);

    // Leggi il file audio WAV
    const readFileAsync = promisify(fs.readFile);
    const arrayBuffer = await readFileAsync(wavPath);

    // Crea un contesto audio (simulato per Node.js)
    const audioContext = new AudioContext();

    // Decodifica l'array di byte in un buffer audio
    const audioBuffer = await new Promise((resolve, reject) => {
        audioContext.decodeAudioData(arrayBuffer, buffer => {
            resolve(buffer);
        }, error => {
            reject(error);
        });
    });

    // Numero di istanti da prendere (512 istanti)
    const numFrames = 512;

    // Lunghezza di ogni istante in campioni
    const frameSize = Math.floor(audioBuffer.length / numFrames);

    // Array per immagazzinare gli RMS di ogni istante
    const rmsArray = [];

    // Calcola RMS per ogni istante
    for (let i = 0; i < numFrames; i++) {
        let sumOfSquares = 0;

        // Calcola la somma dei quadrati dei campioni in ogni istante
        for (let j = 0; j < frameSize; j++) {
            const sample = audioBuffer.getChannelData(0)[i * frameSize + j];
            sumOfSquares += sample * sample;
        }

        // Calcola l'RMS per l'istante corrente
        const rms = Math.sqrt(sumOfSquares / frameSize);
        rmsArray.push(rms);
    }

    // Calcola la media di tutti gli RMS
    const averageRMS = rmsArray.reduce((acc, val) => acc + val, 0) / rmsArray.length;

    // Output del risultato
    console.log('Average RMS:', averageRMS);

    // Rimuovi il file WAV temporaneo
    fs.unlinkSync(wavPath);

    return averageRMS;
}

// Function to get the last created audio file in the directory
function getLastCreatedAudio(inputPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(inputPath, (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            const audioFiles = files.filter(file => /\.(wav|ogg|m4a|flac|aac|wma|aiff|mid|opus|amr|ape|aac|alac|opus)$/i.test(file));
            if (audioFiles.length === 0) {
                reject(new Error('Nessun file audio trovato nella directory specificata.'));
                return;
            }
            let latestAudio = audioFiles[0];
            let latestAudioCreationTime = fs.statSync(path.join(inputPath, latestAudio)).birthtime;
            audioFiles.forEach(file => {
                const fileCreationTime = fs.statSync(path.join(inputPath, file)).birthtime;
                if (fileCreationTime > latestAudioCreationTime) {
                    latestAudio = file;
                    latestAudioCreationTime = fileCreationTime;
                }
            });
            resolve(path.join(inputPath, latestAudio));
        });
    });
}

// Function to get the last created image in the directory (from your original script)
function getLastCreatedImage(inputPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(inputPath, (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            const imageFiles = files.filter(file => /\.(png|gif|bmp|tif|tiff|webp|svg|psd|ai|eps|raw|cr2|nef|orf|sr2|dng|jpeg|jpg)$/i.test(file));
            if (imageFiles.length === 0) {
                reject(new Error('Nessuna immagine trovata nella directory specificata.'));
                return;
            }
            let latestImage = imageFiles[0];
            let latestImageCreationTime = fs.statSync(path.join(inputPath, latestImage)).birthtime;
            imageFiles.forEach(file => {
                const fileCreationTime = fs.statSync(path.join(inputPath, file)).birthtime;
                if (fileCreationTime > latestImageCreationTime) {
                    latestImage = file;
                    latestImageCreationTime = fileCreationTime;
                }
            });
            currentImageName = latestImage; // Save the name of the latest image
            resolve(path.join(inputPath, latestImage));
        });
    });
}

// Main function to process audio and image
async function processAudioAndImage() {
    try {
        const inputPath = __dirname + '/import-data';
        const outputImagePath = __dirname + '/processed-pictures';
        
        const audioPath = await getLastCreatedAudio(inputPath);
        console.log('Ultimo file audio trovato:', audioPath);
        
        const averageRMS = await calculateAverageRMS(audioPath);
        
        const imagePath = await getLastCreatedImage(inputPath);
        console.log('Ultima immagine trovata:', imagePath);
        
        await applyEffectToImage(imagePath, path.join(outputImagePath, 'processed_' + currentImageName), averageRMS);
    } catch (error) {
        console.error('Errore:', error);
    }
}

// Check if this script is being run directly
if (require.main === module) {
    // If so, execute processAudioAndImage directly
    processAudioAndImage();
}

// Export the main function
module.exports = { processAudioAndImage };
