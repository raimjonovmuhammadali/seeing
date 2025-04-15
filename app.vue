<template>
  <div style="width: 100%; height: 100vh; background-color: blue; color: white; padding: 4px;">
    <h1>Objektlarni aniqlash (ko‘zi ojizlar uchun)</h1>
    <video ref="videoRef" autoplay playsinline muted width="100%" height="480" class="border" />
    <ul v-if="results.length" class="mt-4 space-y-1">
      <li v-for="(r, i) in results" :key="i">
        {{ translateLabel(r.class) }} — {{ (r.score * 100).toFixed(2) }}% — Masofa: {{ estimateDistance(r.bbox[3]) }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'

const videoRef = ref(null)
const results = ref([])

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

  // Empirik kalibratsiya (masofa 3 barobar katta chiqayotgan bo‘lsa, uni 1/3 ga kamaytiramiz)
  const calibrationFactor = 0.33; // Yoki siz o‘z tajribangizga qarab aniqlaysiz
  distanceMeters *= calibrationFactor;

  const stepLength = 0.75;
  const steps = distanceMeters / stepLength;

  return {
    distance: distanceMeters.toFixed(2) + " metr",
    steps: steps < 1 ? "0.5-1 qadam" : Math.round(steps) + " qadam"
  };
}

async function speak(text) {
  const token = 'dwLgjgpzeL95yeM-Ire3jONafy1_uIBWETbC2deF'
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
      return
    }

    const blob = await response.blob()
    const audioUrl = URL.createObjectURL(blob)
    const audio = new Audio(audioUrl)
    await audio.play()

    // Gapirib bo‘lishini kutamiz (taxminan 3s)
    await new Promise(resolve => setTimeout(resolve, 1000))

  } catch (err) {
    console.error('❌ TTS xatosi:', err)
  }
}

async function detectLoop() {
  while (true) {
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

    // Har 1 sekundda detect ishlaydi
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

onMounted(async () => {
  await tf.setBackend('webgl')
  await tf.ready()
  console.log('✅ TensorFlow backend:', tf.getBackend())

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
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
* {
  box-sizing: border-box;
}
</style>
