//import { updateImage } from './script.js';

/* globals Meyda */
	const audioContext = new AudioContext();
const htmlAudioElement = document.getElementById("audio");
const source = audioContext.createMediaElementSource(htmlAudioElement);
source.connect(audioContext.destination);

//const levelRangeElement = document.getElementById("levelRange");
//const powerSpectrumRangeElement = document.getElementById("powerSpectrumRange");
//const stopButton = document.getElementById("stopButton");
export let	  totDB = 0;
export let   totDBCount = 0;
//let   started = false;
//let   isAnalyzerRunning;
let	  averageDB = 0;

export let analyzer;
export let powerSpectrumAnalyzer;
export let flatnessAnalyzer;

if (typeof Meyda === "undefined") {
	console.log("Meyda could not be found! Have you included it?");
} else {
	analyzer = Meyda.createMeydaAnalyzer({
		audioContext: audioContext,
		source: source,
		bufferSize: 512,
		featureExtractors: ["rms"],
		callback: (features) => {
			const rms = features.rms;
			const maxRMS = 1.0; // Assuming 1.0 is the maximum RMS level the device can handle

			// Constants for dB calculation
			const referencePressure = 20e-6; // 20 microPascals - reference pressure for 0 dB SPL (Sound Pressure Level)
			const dBOffset = 94; // Offset to adjust dB to SPL (Sound Pressure Level)

			// Calculate SPL (Sound Pressure Level) in dB
			const rmsVoltage = rms * maxRMS; // RMS voltage proportional to RMS amplitude
			const soundPressure = rmsVoltage / referencePressure; // Calculate sound pressure relative to reference
			const dB = 20 * Math.log10(soundPressure) + dBOffset;

			console.log("RMS:", rms, "dB SPL:", dB.toFixed(2));
			//levelRangeElement.value = rms; // Update UI with RMS (if needed)
			totDB += dB;
			totDBCount++;
			
		},
	});
	

	powerSpectrumAnalyzer = Meyda.createMeydaAnalyzer({
		audioContext: audioContext,
		source: source,
		bufferSize: 512,
		featureExtractors: ["powerSpectrum"],
		callback: (features) => {
			const powerSpectrum = features.powerSpectrum;

			// Calculate the average power spectrum value (simple example)
			const avgPowerSpectrum = powerSpectrum.reduce((sum, value) => sum + value, 0) / powerSpectrum.length;

			console.log("Power Spectrum:", powerSpectrum, "Average:", avgPowerSpectrum.toFixed(2));
			//powerSpectrumRangeElement.value = avgPowerSpectrum; // Update UI with average power spectrum (if needed)
		},
	});

	flatnessAnalyzer = Meyda.createMeydaAnalyzer({
		audioContext: audioContext,
		source: source,
		bufferSize: 512,
		featureExtractors: ["spectralFlatness"],
		callback: (features) => {
			const spectralFlatness = features.spectralFlatness;

			console.log("Spectral Flatness: ", spectralFlatness.toFixed(2));
		},
	});
	

	// isAnalyzerRunning = false;
	// stopButton.addEventListener("click", () => {
	// 	if (isAnalyzerRunning) {
	// 		analyzer.stop();
	// 		powerSpectrumAnalyzer.stop();
	// 		flatnessAnalyzer.stop();
	// 		isAnalyzerRunning = false;
	// 		stopButton.value = "Analyze";
	// 	}
	// 	else {
	// 		analyzer.start();
	// 		powerSpectrumAnalyzer.start();
	// 		flatnessAnalyzer.start();
	// 		isAnalyzerRunning = true;
	// 		stopButton.value = "Stop";
	// 		started = true;
	// 	}
	// 	if (started === true && isAnalyzerRunning === false) {
	// 		console.log("media decibel: ");
	// 		console.log(totDB / totDBCount);
	// 		averageDB = totDB / totDBCount;
	// 		updateImage(null);
	// 	}

	// });
}



function touchStarted() {
	if (getAudioContext().state !== "running") {
		console.log("audio context is not running");
		getAudioContext().resume();
	}
}

document.body.addEventListener('touchstart', touchStarted, false);


//export { averageDB };
