<template>
  <div class="w-full h-screen bg-blue-900 text-white p-4">
    <h1 class="text-2xl font-bold mb-2">Objektlarni aniqlash (ko‘zi ojizlar uchun)</h1>
    <video ref="videoRef" autoplay playsinline muted class="w-full max-h-[480px] border" />
    <ul v-if="results.length" class="mt-4 space-y-2">
      <li v-for="(r, i) in results" :key="i">
        {{ r.class }} — {{ (r.score * 100).toFixed(1) }}% — Masofa: {{ estimateDistance(r.bbox[3]) }}
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
let lastSpoken = ref('')

function estimateDistance(boxHeight) {
  const REAL_OBJECT_HEIGHT = 1.6 // metrda
  const FOCAL_LENGTH = 500 // tajribaviy
  const distanceInMeters = (REAL_OBJECT_HEIGHT * FOCAL_LENGTH) / boxHeight
  const steps = distanceInMeters / 0.75 // 1 qadam ≈ 0.75 m
  return Math.round(steps) + ' qadam'
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'uz-UZ' // yoki 'en-US' kerak bo‘lsa
  speechSynthesis.cancel() // eski gapni to‘xtatish
  speechSynthesis.speak(utterance)
}

onMounted(async () => {
  await tf.setBackend('webgl')
  await tf.ready()
  console.log('✅ TensorFlow backend:', tf.getBackend())

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' } // orqa kamera
    })
    videoRef.value.srcObject = stream

    await new Promise((resolve) => {
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

      // Faqat eng aniq topilgan narsani gapir
      if (predictions.length > 0) {
        const best = predictions[0]
        const objectName = best.class
        const distance = estimateDistance(best.bbox[3])
        const message = `${objectName} ${distance}`

        if (message !== lastSpoken.value) {
          speak(message)
          lastSpoken.value = message
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
