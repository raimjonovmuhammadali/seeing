<template>
    <div class="p-4 max-w-md mx-auto">
      <h1 class="text-xl font-bold mb-4">Masofa hisoblagich (kamera orqali)</h1>
  
      <div class="space-y-3">
        <div>
          <label class="block font-semibold">Ob’ekt kengligi (sm):</label>
          <input v-model.number="realWidth" type="number" class="border p-2 w-full" />
        </div>
  
        <div>
          <label class="block font-semibold">Fokal uzunlik (px):</label>
          <input v-model.number="focalLength" type="number" class="border p-2 w-full" />
        </div>
  
        <div>
          <label class="block font-semibold">Ob’ekt piksellarda (kamera rasmi bo‘yicha):</label>
          <input v-model.number="pixelWidth" type="number" class="border p-2 w-full" />
        </div>
  
        <button @click="calculateDistance" class="bg-blue-600 text-white px-4 py-2 rounded">
          Hisoblash
        </button>
  
        <div v-if="distance !== null" class="mt-4 text-lg font-medium">
          <p>Masofa: {{ distance.toFixed(2) }} sm</p>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const realWidth = ref(4)           // sm
  const focalLength = ref(450)       // px (kamera spetsifikatsiyasidan olinadi yoki kalibratsiya orqali)
  const pixelWidth = ref(30)         // px (rasmda aniqlangan ob’ekt piksellar soni)
  const distance = ref(null)
  
  function calculateDistance() {
    if (pixelWidth.value > 0) {
      distance.value = (realWidth.value * focalLength.value) / pixelWidth.value
    } else {
      distance.value = null
    }
  }
  </script>