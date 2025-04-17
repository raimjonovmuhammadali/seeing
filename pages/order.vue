<template>
    <div class="flex flex-col items-center justify-center min-h-screen bg-[#071c39] px-2">
      <div class="w-full max-w-xl bg-white rounded-xl shadow-lg p-3">
        <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">Buyurtma berish</h2>
        <form class="space-y-4">
          <div>
            <label class="block text-sm text-gray-700 mb-1">Ismingiz</label>
            <input
              type="text"
              placeholder="Ismingizni kiriting"
              class="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-700 mb-1">Familiyangiz</label>
            <input
              type="text"
              placeholder="Familiyangizni kiriting"
              class="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-700 mb-1">Telefon raqamingiz</label>
            <input
              type="tel"
              placeholder="+998 90 123 45 67"
              class="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-700 mb-1">Yashash manzilingiz</label>
            <input
              type="text"
              placeholder="Manzilingizni kiriting"
              class="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            class="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Buyurtma berish
          </button>
        </form>
      </div>
    </div>
  </template>
  