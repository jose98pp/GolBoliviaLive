package com.golbolivialive.tv

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.widget.ImageView
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class CrestImages {
    private val executor = Executors.newFixedThreadPool(3)
    private val handler = Handler(Looper.getMainLooper())
    private val cache = object : LruCache<String, Bitmap>(6 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }
    private val pending = mutableMapOf<String, MutableList<java.lang.ref.WeakReference<ImageView>>>()
    private var closed = false

    fun load(url: String, view: ImageView) {
        if (closed || Catalog.https(url) == null) return
        view.tag = url
        cache.get(url)?.let { show(view, it); return }
        val waiting = pending[url]
        if (waiting != null) { waiting.add(java.lang.ref.WeakReference(view)); return }
        pending[url] = mutableListOf(java.lang.ref.WeakReference(view))
        executor.execute {
            val bitmap = runCatching {
                val connection = URL(url).openConnection() as HttpURLConnection
                connection.connectTimeout = 8000; connection.readTimeout = 8000
                try {
                    check(connection.responseCode == 200)
                    val bytes = connection.inputStream.use { it.readBytesLimited(2 * 1024 * 1024) }
                    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
                    check(bounds.outWidth in 1..8192 && bounds.outHeight in 1..8192)
                    val options = BitmapFactory.Options().apply {
                        inSampleSize = Integer.highestOneBit((maxOf(bounds.outWidth, bounds.outHeight) / 256).coerceAtLeast(1))
                    }
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
                } finally { connection.disconnect() }
            }.getOrNull()
            handler.post {
                if (!closed && bitmap != null) cache.put(url, bitmap)
                pending.remove(url)?.forEach { ref -> ref.get()?.takeIf { !closed && it.tag == url }?.let { view -> if (bitmap != null) show(view, bitmap) } }
            }
        }
    }

    private fun java.io.InputStream.readBytesLimited(limit: Int): ByteArray {
        val output = java.io.ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        while (true) {
            val count = read(buffer)
            if (count < 0) break
            check(output.size() + count <= limit)
            output.write(buffer, 0, count)
        }
        return output.toByteArray()
    }

    private fun show(view: ImageView, bitmap: Bitmap) {
        view.setImageBitmap(bitmap)
        (view.parent as? android.view.ViewGroup)?.getChildAt(0)?.takeIf { it !== view }?.visibility = android.view.View.INVISIBLE
    }

    fun close() { closed = true; executor.shutdownNow(); pending.clear(); cache.evictAll(); handler.removeCallbacksAndMessages(null) }
}
