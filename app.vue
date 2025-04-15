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
let speakCooldown = false

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
  const REAL_OBJECT_HEIGHT = 1.6
  const FOCAL_LENGTH = 500
  const distanceInMeters = (REAL_OBJECT_HEIGHT * FOCAL_LENGTH) / boxHeight
  const steps = distanceInMeters / 0.75
  return Math.round(steps) + " qadam"
}

async function speak(text) {
  if (speakCooldown) return // 3 soniya ichida gapirib bo‘lsa, chiqib ketamiz

  speakCooldown = true // gapiryapti deb belgilaymiz
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
      speakCooldown = false
      return
    }

    const blob = await response.blob()
    const audioUrl = URL.createObjectURL(blob)
    const audio = new Audio(audioUrl)
    audio.play()

    // Gapirib bo‘lgach 3 soniya kutamiz
    setTimeout(() => {
      speakCooldown = false
    }, 3000)

  } catch (err) {
    console.error('❌ TTS xatosi:', err)
    speakCooldown = false
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

  const model = await cocoSsd.load()
  console.log('✅ Model yuklandi')

  const detect = async () => {
    if (videoRef.value && model) {
      const predictions = await model.detect(videoRef.value)
      results.value = predictions

      if (predictions.length) {
        const first = predictions[0]
        const label = translateLabel(first.class)
        const distance = estimateDistance(first.bbox[3])
        const spoken = `${label}, ${distance}`

        if (spoken !== previousSpoken) {
          speak(spoken)
          previousSpoken = spoken
        }
      }
    }
    requestAnimationFrame(detect)
  }

  detect()
})
</script>



<style scoped>
* {
  box-sizing: border-box;
}
</style>
