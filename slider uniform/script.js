import { analyzer, powerSpectrumAnalyzer, flatnessAnalyzer, totDB, totDBCount } from "./scriptMeyda";

//const levelRangeElement = document.getElementById("levelRange");
//const powerSpectrumRangeElement = document.getElementById("powerSpectrumRange");
const stopButton = document.getElementById("stopButton");

let isAnalyzerRunning = false;
let started = false;
let averageDB = 0;

// Funzione per calcolare l'intensità in base alla distanza dal bordo dell'immagine
function calculateIntensity(x, y, width, height) {
    const distLeft = x;
    const distRight = width - x - 1;
    const distTop = y;
    const distBottom = height - y - 1;
    const minDistance = Math.min(distLeft, distRight, distTop, distBottom);
    const normalizedDistance = minDistance / Math.min(width, height);
    const intensity = Math.pow(1 - normalizedDistance, 3); // Modifica il numero per cambiare la forma del gradiente
    return Math.floor(intensity * 255);
}

// Funzione applyEffect modificata con valore casuale
function applyEffect(context, width, height, averageDB) {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;

    const randomFactor = averageDB * 1.5 / 170;
    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        const baseIntensity = calculateIntensity(x, y, width, height);
        const intensity = Math.floor(baseIntensity * randomFactor);

        if (randomFactor > 1.1) {
            data[i] += intensity * randomFactor;   // Rosso
        } else if (randomFactor < 0.9) {
            data[i + 1] += intensity * randomFactor;   // Verde
        }
    }

    context.putImageData(imageData, 0, 0);
}

// Funzioni per gestire l'input dell'immagine e lo slider
document.getElementById('image-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // Applica l'effetto solo se averageDB è stato calcolato
                if (averageDB > 0) {
                    applyEffect(ctx, img.width, img.height, averageDB);
                }

                document.getElementById('original-img').src = e.target.result;
                document.getElementById('modified-img').src = canvas.toDataURL();
                document.getElementById('image-container').appendChild(canvas);

                const slider = document.getElementById('slider');
                slider.style.left = '0px';
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// Gestione dello slider
const slider = document.getElementById('slider');
const container = document.getElementById('image-container');
const modifiedImg = document.getElementById('modified-img');
let isDragging = false;

slider.addEventListener('mousedown', function() {
    isDragging = true;
});

document.addEventListener('mouseup', function() {
    isDragging = false;
});

document.addEventListener('mousemove', function(event) {
    if (isDragging) {
        const containerRect = container.getBoundingClientRect();
        let offsetX = event.clientX - containerRect.left;
        const maxOffsetX = containerRect.width * 0.996;
        if (offsetX < 0) {
            offsetX = 0;
        } else if (offsetX > maxOffsetX) {
            offsetX = maxOffsetX;
        }
        slider.style.left = offsetX + 'px';
        modifiedImg.style.clip = `rect(0, ${offsetX}px, auto, 0)`;
    }
});

stopButton.addEventListener("click", () => {
    if (isAnalyzerRunning) {
        analyzer.stop();
        powerSpectrumAnalyzer.stop();
        flatnessAnalyzer.stop();
        isAnalyzerRunning = false;
        stopButton.value = "Analyze";
    } else {
        analyzer.start();
        powerSpectrumAnalyzer.start();
        flatnessAnalyzer.start();
        isAnalyzerRunning = true;
        stopButton.value = "Stop";
        started = true;
    }
    if (started && !isAnalyzerRunning) {
        averageDB = totDB / totDBCount;
        console.log("media decibel: ");
        console.log(averageDB);

        // Trigger image effect update
        const img = document.getElementById('original-img');
        if (img && img.src) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const imgElement = new Image();
            imgElement.onload = function() {
                canvas.width = imgElement.width;
                canvas.height = imgElement.height;
                ctx.drawImage(imgElement, 0, 0);
                applyEffect(ctx, imgElement.width, imgElement.height, averageDB);
                document.getElementById('modified-img').src = canvas.toDataURL();
            };
            imgElement.src = img.src;
        }
    }
});
