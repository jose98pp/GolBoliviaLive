package com.golbolivialive.tv

import android.graphics.*
import android.graphics.drawable.Drawable

class MatchArt(home: String, away: String, private val hero: Boolean = false) : Drawable() {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val homeColor = runCatching { Color.parseColor(home) }.getOrDefault(Color.rgb(18, 62, 86))
    private val awayColor = runCatching { Color.parseColor(away) }.getOrDefault(Color.rgb(28, 38, 61))

    override fun draw(canvas: Canvas) {
        val rect = RectF(bounds); val w = rect.width(); val h = rect.height()
        canvas.save()
        canvas.clipPath(Path().apply { addRoundRect(rect, 20f, 20f, Path.Direction.CW) })
        paint.shader = LinearGradient(0f, 0f, w, h, intArrayOf(homeColor, awayColor), null, Shader.TileMode.CLAMP)
        canvas.drawRect(rect, paint)
        paint.shader = null; paint.color = Color.argb(if (hero) 120 else 65, 4, 10, 18)
        canvas.drawRect(rect, paint)
        if (hero) {
            paint.style = Paint.Style.STROKE; paint.strokeWidth = 2f; paint.color = Color.argb(35, 255, 255, 255)
            canvas.drawRoundRect(w * .55f, h * .1f, w * .96f, h * .9f, 6f, 6f, paint)
            canvas.drawLine(w * .755f, h * .1f, w * .755f, h * .9f, paint)
            canvas.drawCircle(w * .755f, h * .5f, h * .18f, paint)
            paint.style = Paint.Style.FILL
        }
        paint.shader = LinearGradient(0f, 0f, 0f, h, intArrayOf(Color.TRANSPARENT, Color.argb(225, 4, 10, 18)), null, Shader.TileMode.CLAMP)
        canvas.drawRect(rect, paint); paint.shader = null
        canvas.restore()
    }
    override fun setAlpha(alpha: Int) { paint.alpha = alpha }
    override fun setColorFilter(filter: ColorFilter?) { paint.colorFilter = filter }
    @Deprecated("Android Drawable API") override fun getOpacity() = PixelFormat.TRANSLUCENT
}
