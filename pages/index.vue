<template>
  <div class="flex flex-col items-center justify-between bg-[#071c39] min-h-screen py-4 px-2">
    <!-- Video Container (Fixed on Scroll) -->
    <div class="relative w-full max-w-4xl mb-3 flex items-center justify-center">
      <video ref="videoRef" autoplay playsinline muted class="w-[99%] sm:w-[375px] h-[500px] object-cover rounded-xl shadow-lg border-2 border-gray-300 fixed top-0 z-10" />
    </div>

    <!-- Results Section -->
    <div v-if="results.length" class="w-full max-w-4xl bg-gray-100 p-3 mt-[620px] rounded-md">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Aniqlangan buyum</h2>
      <ul class="bg-white rounded-lg shadow-md p-4 space-y-3">
        <li v-for="(r, i) in results" :key="i" class="flex items-center justify-between text-gray-700 border-b border-gray-200 pb-2">
          <span class="font-medium">{{ translateLabel(r.class) }}</span>
          <span class="text-sm text-gray-500">{{ (r.score * 100).toFixed(2) }}% — {{ estimateDistance(r.bbox[3]) }}</span>
        </li>
      </ul>
    </div>

    <!-- Loader -->
    <div v-if="!model" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
      <div class="loader">Loading...</div> <!-- Add your loading spinner here -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'

const videoRef = ref(null)
const results = ref([])
let isSpeaking = false

let previousSpoken = ''
let model = null

const uzbekLabels = {
  person: "odam",
  bicycle: "velosiped",
  car: "mashina",
  motorcycle: "mototsikl",
  airplane: "samolyot",
  bus: "avtobus",
  train: "poyezd",
  truck: "yuk mashinasi",
  boat: "qayiq",
  bird: "qush",
  cat: "mushuk",
  dog: "it",
  horse: "ot",
  sheep: "qo‘y",
  cow: "sigir",
  bottle: "shisha",
  chair: "stul",
  backpack: "ryukzak",
  tv: "televizor",
  laptop: "noutbuk",
  book: "kitob",
  cellphone: "telefon"
}

function translateLabel(label) {
  return uzbekLabels[label] || label
}

function estimateDistance(boxHeight) {
  const OBJECT_REAL_HEIGHT = 1.6; // metr
  const IMAGE_HEIGHT_IN_PIXELS = 480;
  const CAMERA_VERTICAL_FOV = Math.PI / 3; // 60°

  const focalLength = IMAGE_HEIGHT_IN_PIXELS / (2 * Math.tan(CAMERA_VERTICAL_FOV / 2));

  let distanceMeters = (OBJECT_REAL_HEIGHT * focalLength) / boxHeight;

  const calibrationFactor = 0.33; // Tajriba asosida aniqlangan
  distanceMeters *= calibrationFactor;

  const stepLength = 0.75;
  const steps = distanceMeters / stepLength;

  // Obyekt emas, oddiy matn qaytariladi
  const distanceText = distanceMeters.toFixed(2) + " metr";
  const stepsText = steps < 1 ? "0.5-1 qadam" : Math.round(steps) + " qadam";

  return `gacha: ${distanceText}`;
}

async function speak(text) {
  if (isSpeaking) return // Agar gapirayotgan bo‘lsa, qaytamiz

  isSpeaking = true

  const token = 'f9q208KY3hraE64wU2rHHz0FtzhAk7K6XFCmMMLD'
  const speaker_id = 1

  const formData = new URLSearchParams()
  formData.append('token', token)
  formData.append('text', text)
  formData.append('speaker_id', speaker_id)

  try {
    const response = await fetch('https://api.muxlisa.uz/v1/api/services/tts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData,
    })

    if (!response.ok) {
      console.error('❌ Audio olishda xatolik:', response.statusText)
      isSpeaking = false
      return
    }

    const blob = await response.blob()
    const audioUrl = URL.createObjectURL(blob)
    const audio = new Audio(audioUrl)

    await new Promise((resolve) => {
      audio.onended = () => {
        isSpeaking = false
        resolve()
      }
      audio.onerror = () => {
        isSpeaking = false
        resolve()
      }
      audio.play()
    })

  } catch (err) {
    console.error('❌ TTS xatosi:', err)
    isSpeaking = false
  }
}

async function detectLoop() {
  let lastDetectionTime = Date.now()

  async function detect() {
    const currentTime = Date.now()

    // Check if enough time has passed before running the next detection
    if (currentTime - lastDetectionTime > 1000) {  // run detection every second
      if (videoRef.value && model) {
        const predictions = await model.detect(videoRef.value)
        results.value = predictions

        if (predictions.length) {
          const first = predictions[0]
          const label = translateLabel(first.class)
          const distance = estimateDistance(first.bbox[3])
          const spoken = `${label}, ${distance}`

          if (spoken !== previousSpoken) {
            previousSpoken = spoken
            await speak(spoken)
          }
        }
      }
      lastDetectionTime = currentTime
    }

    // Use requestAnimationFrame for smoother and more efficient detection
    requestAnimationFrame(detect)
  }

  detect() // Start the detection loop
}

onMounted(async () => {
  await tf.setBackend('webgl')
  await tf.ready()
  console.log('✅ TensorFlow backend:', tf.getBackend())

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } // Lower resolution for mobile
    })
    videoRef.value.srcObject = stream

    await new Promise(resolve => {
      videoRef.value.onloadeddata = () => {
        console.log('🎥 Kamera tayyor')
        resolve()
      }
    })
  } catch (err) {
    console.error('❌ Kamera ulanmadi:', err)
    return
  }

  model = await cocoSsd.load()
  console.log('✅ Model yuklandi')

  // Asosiy doimiy aniqlash sikli
  detectLoop()
})
</script>

<style scoped>
.loader {
  border: 4px solid #f3f3f3; /* Light grey */
  border-top: 4px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
