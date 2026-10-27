package com.golbolivialive.tv

import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.media3.ui.AspectRatioFrameLayout
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.media3.common.C
import androidx.media3.exoplayer.analytics.AnalyticsListener
import androidx.media3.exoplayer.source.LoadEventInfo
import androidx.media3.exoplayer.source.MediaLoadData
import java.io.IOException
import java.net.URI
import android.view.Gravity
import android.view.MotionEvent
import org.json.JSONObject
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.media3.common.MediaItem
import androidx.media3.common.AudioAttributes
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.HttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.upstream.DefaultBandwidthMeter
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import java.util.concurrent.Executors

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class MainActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private val executor = Executors.newFixedThreadPool(4)
    private val catalogExecutor = Executors.newSingleThreadExecutor()
    private val playbackExecutor = Executors.newFixedThreadPool(2)
    private var playbackRequest = 0
    private var resolveDeadline: Runnable? = null
    private var resolving = false
    private var playbackStartedAt = 0L
    private var resolveTimeMs: Long? = null
    private var firstFrameMs: Long? = null
    private var playbackStage = "Preparación"
    private var playbackHttp: Int? = null
    private var playbackError = ""
    private var playbackWarning = ""
    private var playingSource: WatchSource? = null
    private val preferences by lazy { getSharedPreferences("viewer", MODE_PRIVATE) }
    private val backgroundColor = Color.rgb(7, 14, 28)
    private val green: Int get() = when (preferences.getString("accent", "green")) {
        "blue" -> Color.rgb(96, 184, 255)
        "gold" -> Color.rgb(255, 210, 105)
        else -> Color.rgb(54, 220, 150)
    }
    private val crestImages by lazy { CrestImages(this) }
    private val catalogState = CatalogState()
    private val eventEnricher = EventEnricher()
    private var enriching = false
    private var lastEnrichmentAt = 0L
    private var lastEnrichmentKey = ""
    private var startupWatchdog: Runnable? = null
    private var broadcastRetry: Runnable? = null
    private var broadcastAttempts = 0
    private var broadcastStartedAt = 0L
    private var broadcastHasPlayed = false
    private var forceEnrichment = false
    private var lastCatalogAt = 0L
    private var syncLabel: TextView? = null
    private val remotePress = RemotePress()
    private var pendingOk: KeyEvent? = null
    private val heldOk = Runnable { if (remotePress.hold()) showRemoteOptions() }
    private var teamsLoading = false
    private var catalogUi: Triple<List<WatchItem>, List<WatchItem>, String>? = null
    private var catalogScroll: ScrollView? = null
    private val retryCatalog = Runnable { loadCatalog() }
    private var embedded: EmbeddedPlayer? = null
    private var videoHost: FrameLayout? = null
    private var watchHeader: TextView? = null
    private var watchChrome: FrameLayout? = null
    private var watchMenu: Button? = null
    private var chromeVisible = true
    private val hideChrome = object : Runnable {
        override fun run() {
            if (selected == null || !active) return
            showWatchChrome(false)
        }
    }
    private lateinit var root: LinearLayout
    private lateinit var body: LinearLayout
    private var matches = emptyList<WatchItem>()
    private var channels = emptyList<WatchItem>()
    private var section = "Inicio"
    private var query = ""
    private var sportFilter = "all"
    private var watchCompetition: LinearLayout? = null
    private var page = 0
    private var loading = false
    private var notice = "Conectando con GolBoliviaLive…"
    private var selected: WatchItem? = null
    private var sourceIndex = 0
    private var player: ExoPlayer? = null
    private var playerView: PlayerView? = null
    private var playerStatus: TextView? = null
    private var resumePlayback = true
    private var returnFocus: String? = null
    private var active = false
    private var matchesLoading = false
    private var channelsLoading = false
    private var channelsLoadedAt = 0L
    private var latestEvents = JSONObject("{\"events\":[]}")
    private var latestTeams = emptyMap<String, TeamInfo>()
    private var matchNotice = ""
    private var channelNotice = ""
    private val refresh = object : Runnable {
        override fun run() {
            loadCatalog()
            handler.postDelayed(this, 10000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        section = savedInstanceState?.getString("section") ?: "Inicio"
        query = savedInstanceState?.getString("query").orEmpty()
        sportFilter = savedInstanceState?.getString("sportFilter") ?: "all"
        window.decorView.setOnApplyWindowInsetsListener { view, insets ->
            if (selected != null) view.setPadding(0, 0, 0, 0)
            else view.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            insets
        }
        restoreCatalog()
        render()
        PlaybackSnapshot.decode(savedInstanceState?.getString("playback"))?.let { open(it.item, it) }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("section", section)
        outState.putString("query", query)
        outState.putString("sportFilter", sportFilter)
        selected?.let { outState.putString("playback", PlaybackSnapshot(it, sourceIndex, player?.playWhenReady ?: resumePlayback).encode()) }
        super.onSaveInstanceState(outState)
    }

    override fun onStart() {
        super.onStart()
        active = true
        if (selected != null) resolvePlayback()
        loadCatalog()
        handler.postDelayed(refresh, 10000)
        if (selected != null) { applyImmersive(); handler.postDelayed(hideChrome, 5000) }
    }

    override fun onStop() {
        active = false
        cancelResolution()
        cancelRemotePress()
        handler.removeCallbacks(refresh)
        handler.removeCallbacks(retryCatalog)
        handler.removeCallbacks(hideChrome)
        resumePlayback = player?.playWhenReady ?: resumePlayback
        releasePlayer()
        super.onStop()
    }

    override fun onDestroy() {
        cancelRemotePress()
        eventEnricher.close()
        crestImages.close()
        catalogExecutor.shutdownNow()
        playbackExecutor.shutdownNow()
        executor.shutdownNow()
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (selected == null) render(currentFocus?.tag as? String)
        else {
            applyImmersive()
            videoHost?.requestLayout()
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && selected != null) applyImmersive()
    }

    private fun applyImmersive() {
        val watching = selected != null
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(!watching)
            window.insetsController?.apply {
                if (watching) {
                    systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    hide(WindowInsets.Type.systemBars())
                } else show(WindowInsets.Type.systemBars())
            }
        } else {
            window.decorView.systemUiVisibility = if (watching) View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE else View.SYSTEM_UI_FLAG_VISIBLE
        }
        if (watching) window.decorView.setPadding(0, 0, 0, 0)
        window.decorView.requestApplyInsets()
    }

    private fun showWatchChrome(show: Boolean) {
        chromeVisible = show
        watchChrome?.visibility = if (show) View.VISIBLE else View.GONE
        watchMenu?.visibility = if (show) View.VISIBLE else View.GONE
        handler.removeCallbacks(hideChrome)
        if (show) handler.postDelayed(hideChrome, 5000)
        else { embedded?.focusVideo(); playerView?.requestFocus() }
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun largeText() = preferences.getBoolean("largeText", false)
    private fun label(value: String, size: Float, muted: Boolean = false) = TextView(this).apply {
        text = value
        textSize = size * if (largeText()) 1.15f else 1f
        setTextColor(if (muted) Color.rgb(164, 177, 196) else Color.WHITE)
        setPadding(dp(4), dp(5), dp(4), dp(5))
    }

    private fun surface(focused: Boolean = false, featured: Boolean = false) = GradientDrawable(
        GradientDrawable.Orientation.TL_BR,
        if (featured) intArrayOf(Color.rgb(21, 65, 62), Color.rgb(17, 29, 46))
        else intArrayOf(Color.rgb(28, 39, 58), Color.rgb(17, 25, 40))
    ).apply {
        cornerRadius = dp(16).toFloat()
        setStroke(dp(if (focused) 3 else 1), if (focused) green else Color.rgb(46, 65, 92))
    }

    private fun focusable(view: View, tag: String) {
        view.tag = tag
        view.isFocusable = true
        view.isClickable = true
        view.background = surface()
        view.setOnFocusChangeListener { target, focused ->
            target.background = surface(focused)
            target.elevation = dp(if (focused) 8 else 0).toFloat()
            if (focused) target.parent?.requestChildFocus(target, target)
        }
    }

    private fun button(title: String, tag: String = title, action: () -> Unit) = Button(this).apply {
        text = title
        isAllCaps = false
        textSize = if (largeText()) 18f else 15f
        setTextColor(Color.WHITE)
        setPadding(dp(18), dp(8), dp(18), dp(8))
        minimumHeight = dp(52)
        focusable(this, tag)
        setOnClickListener { action() }
        layoutParams = LinearLayout.LayoutParams(-2, -2).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) }
    }

    private fun favorites() = preferences.getStringSet("favorites", emptySet()).orEmpty()
    private fun toggleFavorite(item: WatchItem) {
        val updated = favorites().toMutableSet()
        if (!updated.add(item.id)) updated.remove(item.id)
        preferences.edit().putStringSet("favorites", updated).apply()
        Toast.makeText(this, if (item.id in updated) "Guardado en favoritos" else "Quitado de favoritos", Toast.LENGTH_SHORT).show()
    }

    private fun render(focusTag: String? = null, keepScroll: Boolean = false) {
        if (selected != null || isDestroyed) return
        val savedScroll = if (keepScroll) catalogScroll?.scrollY ?: 0 else 0
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(backgroundColor)
            setPadding(dp(24), dp(12), dp(24), dp(12))
        }
        setContentView(root)
        val header = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        header.addView(label("GOLBOLIVIA  LIVE", 21f).apply {
            setTextColor(green); setTypeface(typeface, Typeface.BOLD)
        }, LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(button("Buscar") { search() })
        header.setPadding(dp(8), dp(4), dp(8), dp(4))
        header.background = GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,
            intArrayOf(Color.rgb(16, 34, 62), Color.rgb(11, 21, 41))).apply { cornerRadius = dp(16).toFloat() }
        root.addView(header)
        val nav = LinearLayout(this)
        listOf("Inicio", "Partidos", "Canales", "Guía TV", "Favoritos", "Ajustes").forEach { tab ->
            nav.addView(button((if (section == tab) "• " else "") + if (tab == "Partidos") "Eventos" else tab, "nav:$tab") {
                section = tab; page = 0; render("nav:$tab")
            }.apply {
                val chosen = section == tab
                fun style(focused: Boolean) {
                    background = surface(focused, chosen)
                    setTextColor(if (chosen) green else Color.WHITE)
                    setTypeface(typeface, if (chosen) Typeface.BOLD else Typeface.NORMAL)
                }
                style(false)
                setOnFocusChangeListener { _, focused -> style(focused) }
                minimumHeight = dp(44); textSize = if (largeText()) 16f else 14f
            })
        }
        val navScroll = HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; addView(nav) }
        if (resources.configuration.screenWidthDp >= 700) {
            val searchButton = header.getChildAt(1); header.removeView(searchButton)
            header.addView(navScroll, LinearLayout.LayoutParams(0, -2, 3f)); header.addView(searchButton)
        } else root.addView(navScroll)
        body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(4), dp(12), dp(4), dp(32)) }
        catalogScroll = ScrollView(this).apply { isFillViewport = true; addView(body) }
        root.addView(catalogScroll, LinearLayout.LayoutParams(-1, 0, 1f))
        if (section == "Ajustes") settings() else {
            syncLabel = label(listOf(notice, syncText()).filter { it.isNotBlank() }.joinToString(" · "), 12f, true).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END }
            body.addView(syncLabel)
            if (query.isNotBlank()) {
                body.addView(label("Resultados para «$query»", 22f))
                body.addView(button("Quitar búsqueda") { query = ""; page = 0; render() })
            }
            if (section !in listOf("Canales", "Guía TV")) {
                val filters = LinearLayout(this)
                listOf("all" to "Todos", "football" to "Fútbol", "basketball" to "Básquet", "mma" to "MMA / UFC", "other" to "Otros").forEach { (key, name) ->
                    filters.addView(button((if (sportFilter == key) "• " else "") + name, "sport:$key") { sportFilter = key; page = 0; render("sport:$key") }.apply { minimumHeight = dp(36); setPadding(dp(12), dp(4), dp(12), dp(4)); textSize = 13f })
                }
                body.addView(HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; addView(filters) })
            }
            fun filtered(items: List<WatchItem>) = items.filter {
                (it.channel || section == "Canales" || sportFilter == "all" || it.sport == sportFilter) &&
                    (query.isBlank() || (it.title + " " + it.subtitle + " " + it.home?.name.orEmpty() + " " + it.away?.name.orEmpty()).contains(query, ignoreCase = true))
            }
            when (section) {
                "Inicio" -> {
                    val live = filtered(matches).filter { it.live }
                    (live.firstOrNull() ?: filtered(matches).firstOrNull())?.let { featured -> hero(featured) }
                    if (preferences.getBoolean("showRecent", true)) {
                        val recent = ViewerLibrary.available(ViewerLibrary.recentIds(preferences.getString("recentItems", null)), filtered(matches + channels))
                        if (recent.isNotEmpty()) row("Recientes", recent)
                    }
                    row("En vivo", live)
                    row("Próximos eventos", filtered(matches).filter { it.category == "today" })
                    row("Resultados", filtered(matches).filter { it.category == "finished" })
                    row("Tus favoritos", filtered(matches + channels).filter { it.id in favorites() })
                    row("Explorar canales", filtered(channels).take(24))
                }
                "Partidos" -> grid("Eventos", filtered(matches))
                "Canales" -> grid("Canales", filtered(channels))
                "Guía TV" -> guide(filtered(channels))
                "Favoritos" -> grid("Tus favoritos", filtered(matches + channels).filter { it.id in favorites() })
            }
            body.addView(button(if (loading) "Actualizando…" else "Actualizar catálogo") { loadCatalog(true) })
        }
        val target = focusTag?.let { root.findViewWithTag<View>(it) }
            ?: root.findViewWithTag("nav:$section")
        target?.post { if (keepScroll) catalogScroll?.scrollTo(0, savedScroll); target.requestFocus() }
    }

    private fun shield(team: TeamInfo, size: Int, portrait: Boolean = false, light: Boolean = false): View = FrameLayout(this).apply {
        layoutParams = LinearLayout.LayoutParams(dp(size), dp(if (portrait) size * 4 / 3 else size))
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        addView(label(team.name.split(' ').filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1) }.uppercase(), size / 3f).apply {
            gravity = Gravity.CENTER; setTypeface(typeface, Typeface.BOLD)
            if (light) setTextColor(Color.rgb(30, 40, 60))
        }, FrameLayout.LayoutParams(-1, -1))
        val image = ImageView(this@MainActivity).apply { scaleType = ImageView.ScaleType.FIT_CENTER; contentDescription = null }
        addView(image, FrameLayout.LayoutParams(-1, -1).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) })
        if (team.crest.isNotBlank()) crestImages.load(team.crest, image)
    }

    private fun matchup(item: WatchItem, large: Boolean, light: Boolean = false): LinearLayout = LinearLayout(this).apply {
        gravity = Gravity.CENTER
        val size = if (large) 90 else if (light) { if (item.sport == "mma") 60 else 42 } else 58
        item.home?.let { addView(shield(it, size, item.sport == "mma", light)) }
        addView(label(item.score, if (large) 35f else if (light) 18f else 25f).apply {
            gravity = Gravity.CENTER; setTypeface(typeface, Typeface.BOLD)
            if (light) setTextColor(Color.rgb(18, 28, 44))
        }, LinearLayout.LayoutParams(0, -2, 1f))
        item.away?.let { addView(shield(it, size, item.sport == "mma", light)) }
    }

    private fun competitionBadge(item: WatchItem): LinearLayout = LinearLayout(this).apply {
        gravity = Gravity.CENTER_VERTICAL
        if (item.competitionLogo.isNotBlank()) addView(shield(TeamInfo("competition:${item.id}", item.competition, item.competitionLogo), 36))
        addView(label(item.competition.ifBlank { sportName(item.sport) }, 13f, true).apply {
            maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END
        }, LinearLayout.LayoutParams(0, -2, 1f))
    }

    private fun sportName(sport: String) = when (sport) { "basketball" -> "Básquet"; "mma" -> "MMA / UFC"; "other" -> "Evento"; else -> "Fútbol" }
    private fun resultText(item: WatchItem) = listOf(item.result, item.winner.takeIf { it.isNotBlank() }?.let { "Ganador/a: $it" }.orEmpty())
        .filter { it.isNotBlank() }.joinToString(" · ")
    private fun watchTitle(item: WatchItem) = listOf(item.title, item.score, item.status, resultText(item)).filter { it.isNotBlank() }.joinToString(" · ")

    private fun matchSurface(view: View, item: WatchItem, featured: Boolean = false) {
        view.background = MatchArt(item.home?.color ?: "#193D57", item.away?.color ?: "#122438", featured)
        view.setOnFocusChangeListener { target, focused ->
            target.foreground = if (focused) GradientDrawable().apply {
                setColor(Color.TRANSPARENT); cornerRadius = dp(16).toFloat(); setStroke(dp(3), green)
            } else null
            target.elevation = dp(if (focused) 8 else 0).toFloat()
            target.animate().scaleX(if (focused) 1.035f else 1f).scaleY(if (focused) 1.035f else 1f).setDuration(140).start()
        }
    }

    private fun primaryButton(title: String, tag: String, action: () -> Unit): Button = button(title, tag, action).apply {
        fun style(focused: Boolean) {
            background = GradientDrawable().apply { setColor(Color.WHITE); cornerRadius = dp(28).toFloat(); setStroke(dp(if (focused) 4 else 1), if (focused) green else Color.LTGRAY) }
            setTextColor(Color.rgb(10, 17, 28)); setTypeface(typeface, Typeface.BOLD)
        }
        style(false)
        setOnFocusChangeListener { view, focused -> style(focused); view.elevation = dp(if (focused) 10 else 0).toFloat() }
    }

    private fun hero(item: WatchItem) {
        val wide = resources.configuration.screenWidthDp >= 700
        val hero = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(-1, if (wide) dp(if (largeText()) 310 else (resources.configuration.screenHeightDp * .43).toInt().coerceIn(220, 300)) else -2).apply { setMargins(0, dp(8), 0, dp(24)) }
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(Color.rgb(10, 18, 34), Color.rgb(26, 33, 107), Color.rgb(48, 27, 91))).apply { cornerRadius = dp(16).toFloat() }
            clipToOutline = true
        }
        if (wide) {
            val art = LinearLayout(this).apply {
                gravity = Gravity.CENTER; setPadding(dp(8), dp(20), dp(20), dp(20))
                item.home?.let { addView(shield(it, if (resources.configuration.screenWidthDp < 900) 90 else if (item.sport == "mma") 110 else 132, item.sport == "mma")) }
                addView(LinearLayout(this@MainActivity).apply {
                    orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER
                    if (item.competitionLogo.isNotBlank()) addView(shield(TeamInfo(item.id, item.competition, item.competitionLogo), 32))
                    addView(label("VS", 18f).apply { gravity = Gravity.CENTER })
                })
                item.away?.let { addView(shield(it, if (resources.configuration.screenWidthDp < 900) 90 else if (item.sport == "mma") 110 else 132, item.sport == "mma")) }
            }
            hero.addView(art, FrameLayout.LayoutParams(dp(((resources.configuration.screenWidthDp - 64) * .43).toInt()), -1, Gravity.END))
            hero.addView(View(this).apply { background = GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, intArrayOf(Color.rgb(7, 12, 23), Color.argb(205, 7, 12, 23), Color.TRANSPARENT)) }, FrameLayout.LayoutParams(-1, -1))
        }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_VERTICAL; setPadding(dp(24), dp(if (wide) 8 else 16), dp(20), dp(if (wide) 8 else 16))
            addView(label("${item.competition.ifBlank { sportName(item.sport) }}  ·  ${item.status}", 12f).apply { setTextColor(green); maxLines = 2 })
            addView(label(item.title, 26f).apply { setTypeface(typeface, Typeface.BOLD); maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END })
            if (!wide) addView(competitionBadge(item))
            addView(label("${item.home?.name.orEmpty()}  ·  ${item.score}  ·  ${item.away?.name.orEmpty()}", 16f).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END })
            if (!wide) addView(matchup(item, false), LinearLayout.LayoutParams(-1, dp(if (item.sport == "mma") 96 else 72)))
            addView(label(listOf(resultText(item), item.subtitle).filter { it.isNotBlank() }.joinToString(" · "), 12f, true).apply { maxLines = 1 })
            addView(HorizontalScrollView(this@MainActivity).apply {
                isHorizontalScrollBarEnabled = false
                addView(LinearLayout(this@MainActivity).apply {
                addView(primaryButton(if (item.sources.isEmpty()) "Ver detalle" else "▶ Ver evento", "hero:${item.id}") { open(item) }.apply { minimumHeight = dp(44); setPadding(dp(14), dp(4), dp(14), dp(4)); contentDescription = "Ver ${item.title}" })
                addView(button(if (item.id in favorites()) "★ Guardado" else "☆ Favorito", "hero:favorite:${item.id}") { toggleFavorite(item); render("hero:favorite:${item.id}") }.apply { minimumHeight = dp(44); setPadding(dp(14), dp(4), dp(14), dp(4)) })
                })
            })
        }
        hero.addView(content, FrameLayout.LayoutParams(if (wide) dp(((resources.configuration.screenWidthDp - 64) * .59).toInt()) else -1, if (wide) -1 else -2))
        body.addView(hero)
    }

    private fun card(item: WatchItem, width: Int): View = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(8), dp(8), dp(8), dp(10))
        layoutParams = LinearLayout.LayoutParams(dp(width), dp(if (largeText()) 310 else if (preferences.getBoolean("compactCards", false)) 224 else if (resources.configuration.screenWidthDp >= 700) 244 else 286)).apply { setMargins(dp(8), dp(8), dp(8), dp(12)) }
        focusable(this, item.id); matchSurface(this, item)
        contentDescription = "${item.title}. ${item.status}. ${item.score}. ${resultText(item)}. ${item.subtitle}. OK: abrir. Mantén OK: favorito."
        val poster = LinearLayout(this@MainActivity).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(dp(10), dp(10), dp(10), dp(10))
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(Color.rgb(23, 43, 72), Color.rgb(11, 23, 43))).apply { cornerRadius = dp(10).toFloat() }
            clipToOutline = true
            addView(label(item.status, 11f).apply { setTextColor(if (item.live) green else Color.rgb(203, 217, 236)); maxLines = 2; setTypeface(typeface, Typeface.BOLD) })
            if (item.channel) addView(shield(TeamInfo(item.id, item.title, item.logo), 92, light = true))
            else {
                if (item.competitionLogo.isNotBlank()) addView(shield(TeamInfo(item.id, item.competition, item.competitionLogo), 36, light = true))
                addView(label(item.competition.ifBlank { sportName(item.sport) }, 11f).apply { setTextColor(Color.rgb(190, 206, 227)); maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END })
                addView(matchup(item, false, false), LinearLayout.LayoutParams(-1, 0, 1f))
            }
        }
        addView(poster, LinearLayout.LayoutParams(-1, 0, 1f))
        addView(label(item.title, 16f).apply { maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END; setTypeface(typeface, Typeface.BOLD) })
        addView(label((if (item.id in favorites()) "★ " else "") + listOf(resultText(item), item.subtitle).filter { it.isNotBlank() }.joinToString(" · "), 11f, true).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END })
        setOnClickListener { open(item) }
        setOnLongClickListener { toggleFavorite(item); render(tag as? String ?: item.id); true }
    }

    private fun row(title: String, items: List<WatchItem>) {
        body.addView(label(title, 23f))
        if (items.isEmpty()) { body.addView(label("Sin contenido disponible en esta sección.", 15f, true)); return }
        val rail = LinearLayout(this)
        items.forEach { item -> rail.addView(card(item, 206).apply { tag = "rail:$title:${item.id}" }) }
        body.addView(HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; addView(rail) })
    }

    private fun grid(title: String, items: List<WatchItem>) {
        body.addView(label("$title · ${items.size}", 26f))
        if (items.isEmpty()) body.addView(label("Sin resultados. Puedes buscar otro nombre o actualizar.", 16f, true))
        val width = resources.configuration.screenWidthDp - 70
        val columns = if (width >= 820) 3 else if (width >= 480) 2 else 1
        val slice = items.drop(page * 24).take(24)
        slice.chunked(columns).forEach { group ->
            body.addView(LinearLayout(this).apply { group.forEach { addView(card(it, width / columns - 16)) } })
        }
        val pagination = LinearLayout(this)
        if (page > 0) pagination.addView(button("Anterior") { page--; render() })
        if ((page + 1) * 24 < items.size) pagination.addView(button("Siguiente") { page++; render() })
        body.addView(pagination)
    }

    private fun guide(items: List<WatchItem>) {
        body.addView(label("Guía TV", 28f).apply { setTypeface(typeface, Typeface.BOLD) })
        body.addView(label("Elige un canal para ver sus señales. La programación horaria aún no está disponible.", 14f, true))
        if (items.isEmpty()) body.addView(label("No hay canales para esta búsqueda. Prueba otro nombre o actualiza el catálogo.", 16f, true))
        items.drop(page * 24).take(24).forEachIndexed { index, item ->
            val channelRow = LinearLayout(this).apply {
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(12), dp(8), dp(12), dp(8))
                focusable(this, "guide:${item.id}")
                contentDescription = "${item.title}. ${item.subtitle}. OK: ver canal. Mantén OK: favorito."
                addView(label("%02d".format(page * 24 + index + 1), 16f, true), LinearLayout.LayoutParams(dp(42), -2))
                addView(shield(TeamInfo(item.id, item.title, item.logo), 56))
                addView(LinearLayout(this@MainActivity).apply {
                    orientation = LinearLayout.VERTICAL
                    addView(label((if (item.id in favorites()) "★ " else "") + item.title, 18f).apply { maxLines = 2; setTypeface(typeface, Typeface.BOLD) })
                    addView(label(item.subtitle, 12f, true).apply { maxLines = 2 })
                    addView(label(if (item.sources.isEmpty()) "Sin señal publicada" else "${item.sources.size} señal disponible · Ver canal", 12f).apply { setTextColor(green) })
                }, LinearLayout.LayoutParams(0, -2, 1f))
                setOnClickListener { open(item) }
                setOnLongClickListener { toggleFavorite(item); render("guide:${item.id}"); true }
            }
            body.addView(channelRow, LinearLayout.LayoutParams(-1, -2).apply { setMargins(0, dp(4), 0, dp(4)) })
        }
        body.addView(LinearLayout(this).apply {
            if (page > 0) addView(button("Anterior") { page--; render() })
            if ((page + 1) * 24 < items.size) addView(button("Siguiente") { page++; render() })
        })
    }

    private fun search() {
        val input = EditText(this).apply { setText(query); hint = "Nombre de partido, canal o país"; setSingleLine() }
        AlertDialog.Builder(this).setTitle("Buscar").setView(input)
            .setPositiveButton("Buscar") { _, _ -> query = input.text.toString().trim(); page = 0; render() }
            .setNegativeButton("Cancelar", null).show()
    }

    private fun settings() {
        body.addView(label("A tu manera", 32f))
        body.addView(label("Flechas: navegar · OK: abrir · Atrás: volver\nMantén OK sobre una tarjeta para guardarla en favoritos.\nDurante el video: OK muestra los controles; Play/Pausa controla la reproducción.", 17f, true))
        fun toggle(key: String, title: String, default: Boolean) {
            body.addView(button("$title: ${if (preferences.getBoolean(key, default)) "Activado" else "Desactivado"}", key) {
                preferences.edit().putBoolean(key, !preferences.getBoolean(key, default)).apply(); render(key)
            })
        }
        toggle("autoplay", "Reproducir al abrir", true)
        toggle("channelKeys", "CH+ / CH− cambia de canal", true)
        toggle("largeText", "Texto grande", false)
        toggle("compactCards", "Tarjetas compactas", false)
        toggle("showRecent", "Mostrar recientes en Inicio", true)
        body.addView(button("Color de la interfaz", "accent") {
            val colors = arrayOf("Verde GolBolivia", "Azul TV", "Dorado")
            val keys = arrayOf("green", "blue", "gold")
            AlertDialog.Builder(this).setTitle("Personalizar GolBoliviaLive")
                .setSingleChoiceItems(colors, keys.indexOf(preferences.getString("accent", "green"))) { dialog, which ->
                    preferences.edit().putString("accent", keys[which]).apply(); dialog.dismiss(); render("accent")
                }.setNegativeButton("Cancelar", null).show()
        })
        body.addView(button("Borrar recientes", "clearRecent") {
            preferences.edit().remove("recentItems").apply(); render("clearRecent")
        })
        body.addView(button("Configurar mando Bluetooth") {
            try { startActivity(Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)) }
            catch (_: ActivityNotFoundException) {
                Toast.makeText(this, "Abre Ajustes de Android → Mandos y accesorios para emparejar tu mando.", Toast.LENGTH_LONG).show()
            }
        })
        body.addView(button("Calidad: ${preferences.getString("quality", "Automática")}", "quality") {
            val labels = arrayOf("Automática", "Ahorro de datos · hasta 480p", "HD · hasta 720p", "Full HD · hasta 1080p")
            AlertDialog.Builder(this).setTitle("Calidad máxima").setItems(labels) { _, which ->
                preferences.edit().putString("quality", labels[which]).putInt("maxHeight", intArrayOf(Int.MAX_VALUE, 480, 720, 1080)[which]).apply()
                render("quality")
            }.show()
        })
        body.addView(label("El volumen se controla con los botones del dispositivo o del televisor.\nYouTube, Kick y señales web se reproducen dentro de la app.\nGolBoliviaLive · Versión ${BuildConfig.VERSION_NAME}", 14f, true))
    }

    private fun syncText(): String = if (lastCatalogAt == 0L) "Sin consulta reciente confirmada" else
        "Última consulta: " + java.text.DateFormat.getTimeInstance(java.text.DateFormat.MEDIUM).format(java.util.Date(lastCatalogAt))

    private fun catalogChanged() {
        syncLabel?.text = listOf(notice, syncText()).filter { it.isNotBlank() }.joinToString(" · ")
        loading = matchesLoading || channelsLoading
        notice = listOf(matchNotice, channelNotice).filter { it.isNotBlank() }.joinToString(" · ")
            .ifBlank { if (loading) "Actualizando datos…" else "Catálogo actualizado · Mantén OK para favoritos" }
        selected?.let { current ->
            (matches + channels).find { it.id == current.id }?.let { updated ->
                val playing = current.sources.getOrNull(sourceIndex)
                val found = updated.sources.indexOfFirst { if (!playing?.id.isNullOrBlank()) it.id == playing?.id else it.url == playing?.url }
                sourceIndex = found.coerceAtLeast(0)
                selected = current.copy(autoFailover = updated.autoFailover, sources = updated.sources, title = updated.title, subtitle = updated.subtitle, home = updated.home, away = updated.away,
                    status = updated.status, score = updated.score, category = updated.category, live = updated.live,
                    sport = updated.sport, competition = updated.competition, competitionLogo = updated.competitionLogo, result = updated.result, winner = updated.winner)
                watchHeader?.text = watchTitle(updated)
                watchCompetition?.removeAllViews()
                watchCompetition?.addView(if (updated.channel) shield(TeamInfo(updated.id, updated.title, updated.logo), 48) else competitionBadge(updated))
            }
        }
        if (active && selected == null) {
            val count = when (section) { "Canales", "Guía TV" -> channels.size; "Partidos" -> matches.size; else -> (matches + channels).size }
            if (page * 24 >= count) page = 0
            val next = Triple(matches, channels, notice)
            if (next != catalogUi) { catalogUi = next; render(currentFocus?.tag as? String, true) }
        }
    }

    private fun loadCatalog(forceChannels: Boolean = false) {
        if (!active) return
        if (forceChannels) forceEnrichment = true
        if (!matchesLoading) {
            matchesLoading = true
            handler.removeCallbacks(retryCatalog)
            catalogExecutor.execute {
                val result = runCatching { Catalog.fetch("/api/live-events", 6000) }
                handler.post {
                    if (isDestroyed) return@post
                    matchesLoading = false
                    runCatching {
                        val raw = result.getOrThrow()
                        check(catalogState.accept(raw)) { "El servidor todavía no confirmó el catálogo" }
                        if (!raw.optBoolean("stale")) lastCatalogAt = System.currentTimeMillis()
                        latestEvents = SportsEvents.preview(EspnSync.preview(catalogState.events))
                        catalogState.enrich(latestEvents, catalogState.revision)
                        mergeTeams(TeamCatalog.load(latestEvents, false))
                        matches = Catalog.matches(latestEvents, latestTeams)
                        matchNotice = if (raw.optBoolean("stale")) "Datos guardados · El servidor sigue actualizando" else ""
                        persistCatalog()
                        startEnrichment(forceChannels)
                        if (!teamsLoading) {
                            teamsLoading = true
                            val revision = catalogState.revision
                            val input = JSONObject(latestEvents.toString())
                            executor.execute {
                                val teams = runCatching { TeamCatalog.load(input) }
                                handler.post {
                                    if (!isDestroyed) {
                                        teamsLoading = false
                                        if (revision == catalogState.revision) teams.onSuccess { mergeTeams(it); publishMatches() }
                                    }
                                }
                            }
                        }
                    }.onFailure {
                        matchNotice = "Mostrando el último catálogo disponible · Reintentando conexión"
                        if (active) handler.postDelayed(retryCatalog, 4000)
                    }
                    catalogChanged()
                }
            }
        }
        if (!channelsLoading && (forceChannels || System.currentTimeMillis() - channelsLoadedAt > 60000)) {
            channelsLoading = true
            executor.execute {
                val result = runCatching {
                    val raw = Catalog.fetch("/api/iptv/sports", 12000)
                    check(raw.opt("success") != false)
                    Catalog.channels(raw) to raw
                }
                handler.post {
                    if (isDestroyed) return@post
                    channelsLoading = false
                    result.onSuccess { (items, raw) ->
                        if (items.isNotEmpty() || channels.isEmpty()) {
                            channels = items
                            if (raw.toString().length <= 2 * 1024 * 1024) preferences.edit().putString("channelsCache", raw.toString()).apply()
                        }
                        channelsLoadedAt = System.currentTimeMillis(); channelNotice = ""
                    }
                        .onFailure { channelNotice = "No se pudieron actualizar los canales. Se conserva el catálogo anterior" }
                    catalogChanged()
                }
            }
        }
        loading = matchesLoading || channelsLoading
    }

    private fun mergeTeams(incoming: Map<String, TeamInfo>) {
        latestTeams = latestTeams + incoming.mapValues { (id, team) ->
            val old = latestTeams[id]
            if (old == null) team else team.copy(crest = team.crest.ifBlank { old.crest },
                name = if (team.name == id.replace('_', ' ')) old.name else team.name)
        }
    }

    private fun restoreCatalog() {
        runCatching {
            val saved = preferences.getString("channelsCache", null)
            if (saved != null) channels = Catalog.channels(JSONObject(saved))
        }
        runCatching {
            val stored = JSONObject(preferences.getString("catalogCache", null) ?: return)
            val cached = stored.optJSONObject("base") ?: stored.getJSONObject("catalog")
            cached.put("catalogConfirmed", true).put("stale", false)
            catalogState.accept(cached)
            catalogState.enrich(stored.getJSONObject("catalog"), catalogState.revision)
            latestEvents = catalogState.events
            lastCatalogAt = stored.optLong("savedAt")
            val teams = stored.optJSONObject("teams") ?: JSONObject()
            latestTeams = teams.keys().asSequence().associateWith { id ->
                val team = teams.getJSONObject(id)
                TeamInfo(id, team.getString("name"), TeamCatalog.crest(team.optString("crest")), team.optString("color", "#15314D"))
            }
            matches = Catalog.matches(latestEvents, latestTeams)
            notice = "Catálogo guardado · Actualizando datos…"
        }
    }

    private fun persistCatalog() {
        val teams = JSONObject()
        latestTeams.forEach { (id, team) -> teams.put(id, JSONObject().put("name", team.name).put("crest", team.crest).put("color", team.color)) }
        val saved = JSONObject().put("catalog", latestEvents).put("base", catalogState.baseEvents).put("savedAt", lastCatalogAt).put("teams", teams).toString()
        if (saved.length <= 2 * 1024 * 1024) preferences.edit().putString("catalogCache", saved).apply()
    }

    private fun publishMatches() {
        matches = Catalog.matches(latestEvents, latestTeams)
        persistCatalog()
        catalogChanged()
    }

    private fun startEnrichment(force: Boolean = false) {
        if (force) forceEnrichment = true
        if (enriching || !active || latestEvents.getJSONArray("events").length() == 0) return
        val keyRows = latestEvents.getJSONArray("events")
        val key = (0 until keyRows.length()).joinToString("|") {
            val row = keyRows.getJSONObject(it)
            listOf(row.optString("id"), row.optString("version"), row.optString("updatedAt"), row.optJSONObject("espnLink")?.toString().orEmpty(),
                row.optJSONObject("sports")?.optJSONObject("source")?.toString().orEmpty()).joinToString(":")
        }
        if (!forceEnrichment && key == lastEnrichmentKey && System.currentTimeMillis() - lastEnrichmentAt < 30000) return
        forceEnrichment = false
        lastEnrichmentAt = System.currentTimeMillis(); lastEnrichmentKey = key
        enriching = true
        val revision = catalogState.revision
        val input = JSONObject(latestEvents.toString())
        executor.execute {
            val enriched = runCatching { eventEnricher.refresh(input) }
            handler.post {
                if (!isDestroyed) {
                    enriching = false
                    enriched.onSuccess { if (catalogState.enrich(it, revision)) { latestEvents = catalogState.events; publishMatches() } }
                    if (revision != catalogState.revision || forceEnrichment) startEnrichment()
                }
            }
        }
    }

    private fun open(item: WatchItem, restored: PlaybackSnapshot? = null) {
        returnFocus = if (selected == null) currentFocus?.tag as? String ?: item.id else item.id
        if (item.sources.isEmpty()) {
            AlertDialog.Builder(this).setTitle(item.title)
                .setMessage("${item.status} · ${item.score}\n${item.subtitle}\nTodavía no hay una señal disponible para este partido.")
                .setPositiveButton("Aceptar", null)
                .setNeutralButton(if (item.id in favorites()) "Quitar favorito" else "Guardar favorito") { _, _ -> toggleFavorite(item) }.show()
            return
        }
        releasePlayer()
        selected = item
        sourceIndex = restored?.sourceIndex ?: 0
        resumePlayback = restored?.playWhenReady ?: preferences.getBoolean("autoplay", true)
        val screen = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        videoHost = FrameLayout(this)
        screen.addView(videoHost, FrameLayout.LayoutParams(-1, -1))
        val chrome = FrameLayout(this)
        watchChrome = chrome
        val information = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(8), dp(72), dp(8))
            setBackgroundColor(Color.argb(185, 8, 13, 22))
        }
        watchCompetition = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; addView(if (item.channel) shield(TeamInfo(item.id, item.title, item.logo), 48) else competitionBadge(item)) }
        information.addView(watchCompetition)
        watchHeader = label(watchTitle(item), 18f)
        information.addView(watchHeader)
        playerStatus = label("Preparando señal…", 13f, true)
        information.addView(playerStatus)
        chrome.addView(information, FrameLayout.LayoutParams(-1, -2, Gravity.TOP))
        val toolbar = HorizontalScrollView(this).apply {
            setPadding(dp(12), dp(8), dp(12), dp(8)); setBackgroundColor(Color.argb(185, 8, 13, 22))
            addView(LinearLayout(this@MainActivity).apply {
                addView(button("Volver", "watch:back") { closePlayer() })
                addView(button("Reintentar") { resolvePlayback() })
                addView(button("Señales") {
                    val current = selected ?: return@button
                    if (current.sources.isEmpty()) { playerStatus?.text = "Este evento ya no tiene señales publicadas"; return@button }
                    AlertDialog.Builder(this@MainActivity).setTitle("Elegir señal")
                        .setSingleChoiceItems(current.sources.map { it.label }.toTypedArray(), sourceIndex) { dialog, which ->
                            sourceIndex = which; dialog.dismiss(); resolvePlayback()
                        }.setNegativeButton("Cancelar", null).show()
                })
                addView(button("Siguiente señal") {
                    val options = selected?.sources.orEmpty()
                    if (options.size > 1) { sourceIndex = (sourceIndex + 1) % options.size; resolvePlayback() }
                    else playerStatus?.text = if (options.isEmpty()) "Este evento ya no tiene señales publicadas" else "Señal disponible: ${options[0].label}"
                })
                addView(button("Encajar / Llenar") {
                    val zoom = !preferences.getBoolean("zoomVideo", false)
                    preferences.edit().putBoolean("zoomVideo", zoom).apply()
                    playerView?.resizeMode = if (zoom) AspectRatioFrameLayout.RESIZE_MODE_ZOOM else AspectRatioFrameLayout.RESIZE_MODE_FIT
                    playerStatus?.text = if (playerView != null) {
                        if (zoom) "Llenar: se recortan los bordes para ocupar toda la pantalla." else "Encajar: se conserva la imagen completa."
                    } else "En reproductores web usa el ajuste de imagen del proveedor."
                })
                addView(button("Cursor iframe") {
                    if (embedded != null) {
                        val enabled = embedded?.togglePointer() == true
                        Toast.makeText(this@MainActivity, if (enabled) "Flechas: mover · OK: pulsar · Mantén OK: opciones" else "Cursor desactivado", Toast.LENGTH_LONG).show()
                        showWatchChrome(false)
                    } else playerStatus?.text = "El cursor se utiliza con señales web."
                })
                addView(button("Bloqueo anuncios", "watch:ads") {
                    val enabled = !preferences.getBoolean("blockAds", true)
                    preferences.edit().putBoolean("blockAds", enabled).apply()
                    embedded?.setAdBlocking(enabled)
                    playerStatus?.text = if (enabled) "Bloqueo de anuncios externos activado" else "Bloqueo desactivado para esta señal"
                })
                addView(button("Diagnóstico") { showPlaybackDiagnostics() })
                addView(button("Favorito ★") { selected?.let { toggleFavorite(it) } })
            })
        }
        chrome.addView(toolbar, FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM))
        screen.addView(chrome, FrameLayout.LayoutParams(-1, -1))
        watchMenu = button("☰", "watch:menu") { showWatchChrome(!chromeVisible) }.apply { contentDescription = "Mostrar u ocultar controles" }
        screen.addView(watchMenu, FrameLayout.LayoutParams(dp(60), dp(52), Gravity.TOP or Gravity.END).apply {
            setMargins(dp(4), dp(4), dp(8), dp(4))
        })
        setContentView(screen)
        applyImmersive()
        showWatchChrome(true)
        preferences.edit().putString("recentItems", ViewerLibrary.remember(ViewerLibrary.recentIds(preferences.getString("recentItems", null)), item.id)).apply()
        resolvePlayback()
    }

    private fun cancelResolution() {
        playbackRequest++
        resolving = false
        resolveDeadline?.let { handler.removeCallbacks(it) }; resolveDeadline = null
    }

    private fun resolvePlayback() {
        val original = selected ?: return
        if (!active) return
        cancelResolution()
        val request = playbackRequest
        val previous = original.sources.getOrNull(sourceIndex)
        resumePlayback = player?.playWhenReady ?: resumePlayback
        val requestedAt = SystemClock.elapsedRealtime()
        resolveTimeMs = null
        releasePlayer()
        resolving = true
        playbackWarning = ""
        playerStatus?.text = "Consultando la señal vigente…"
        showWatchChrome(true)
        fun complete(resolution: PlaybackResolution) {
            if (request != playbackRequest || selected?.id != original.id || !active || !resolving) return
            resolving = false
            resolveTimeMs = SystemClock.elapsedRealtime() - requestedAt
            resolveDeadline?.let { handler.removeCallbacks(it) }; resolveDeadline = null
            // A newer catalog update wins over a response requested from an older snapshot.
            val current = selected ?: return
            selected = if (current.sources != original.sources) current else resolution.item
            sourceIndex = PlaybackPolicy.sourceIndex(selected!!.sources, previous)
            playbackWarning = resolution.warning
            startPlayer()
        }
        resolveDeadline = Runnable { complete(PlaybackResolution(original, "La verificación tardó demasiado. Se usa el último catálogo disponible.")) }
            .also { handler.postDelayed(it, 2500) }
        playbackExecutor.execute {
            val result = PlaybackResolver.refresh(original) { Catalog.fetch(it, 2000) }
            handler.post { complete(result) }
        }
    }

    private fun showPlaybackDiagnostics() {
        val source = playingSource ?: selected?.sources?.getOrNull(sourceIndex)
        val host = runCatching { URI(source?.url.orEmpty()).host }.getOrNull().orEmpty()
        val format = PlaybackPolicy.mimeType(source ?: WatchSource("", "")) ?: "Reproductor oficial / web"
        val video = player?.videoFormat
        val lines = listOf(
            "Señal: ${source?.label.orEmpty()}", "Servidor: $host", "Formato: $format",
            "Etapa: $playbackStage", "HTTP: ${playbackHttp?.toString() ?: "sin error registrado"}",
            "Error: ${playbackError.ifBlank { "ninguno registrado" }}",
            "Consulta de señal: ${resolveTimeMs?.let { "$it ms" } ?: "sin medir"}",
            "Primera imagen: ${firstFrameMs?.let { "$it ms" } ?: "sin medir"}",
            "Búfer actual: ${player?.totalBufferedDuration?.let { "${it / 1000} s" } ?: "gestionado por el proveedor"}",
            "Video: ${video?.let { "${it.width} × ${it.height}" } ?: "sin datos"}",
            playbackWarning,
            "Este diagnóstico no verifica licencias ni mide la latencia extremo a extremo."
        ).filter { it.isNotBlank() }
        AlertDialog.Builder(this).setTitle("Diagnóstico · GolBoliviaLive").setMessage(lines.joinToString("\n"))
            .setPositiveButton("Cerrar", null).show()
    }

    private fun startPlayer(waitRetry: Boolean = false) {
        val item = selected ?: return
        if (!active) return
        val source = item.sources.getOrNull(sourceIndex) ?: run {
            releasePlayer(); playerStatus?.text = "Este evento ya no tiene señales publicadas"; showWatchChrome(true); return
        }
        releasePlayer()
        playingSource = source
        playbackStartedAt = SystemClock.elapsedRealtime(); firstFrameMs = null
        playbackStage = if (source.embedded) "Reproductor web" else "Manifiesto / archivo"
        playbackHttp = null; playbackError = ""
        if (!waitRetry) { broadcastAttempts = 0; broadcastStartedAt = System.currentTimeMillis(); broadcastHasPlayed = false }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        playerStatus?.text = "Cargando ${source.label}…"
        if (source.embedded) {
            runCatching {
                EmbeddedPlayer(this, source, resumePlayback, preferences.getBoolean("blockAds", true)) { message ->
                    if (selected?.id == item.id && active) {
                        playerStatus?.text = message
                        if (message.contains("no pudo", true) || message.contains("no se pudo", true) || message.contains("HTTP") || message.contains("no permite", true)) showWatchChrome(true)
                    }
                }.also { embedded = it; videoHost?.addView(it, FrameLayout.LayoutParams(-1, -1)) }
            }.onFailure {
                playerStatus?.text = "No se pudo iniciar Android System WebView. Actualízalo para reproducir ${source.provider} dentro de la app."
                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            return
        }
        playerView = PlayerView(this).apply {
            useController = true; controllerShowTimeoutMs = 5000; isFocusable = true
            resizeMode = if (preferences.getBoolean("zoomVideo", false)) AspectRatioFrameLayout.RESIZE_MODE_ZOOM else AspectRatioFrameLayout.RESIZE_MODE_FIT
            setShowNextButton(false); setShowPreviousButton(false)
        }
        videoHost?.addView(playerView, FrameLayout.LayoutParams(-1, -1))
        val http = DefaultHttpDataSource.Factory().setUserAgent("GolBoliviaLive/${BuildConfig.VERSION_NAME}")
            .setConnectTimeoutMs(6000).setReadTimeoutMs(8000).setAllowCrossProtocolRedirects(false)
        val mediaFactory = DefaultMediaSourceFactory(DefaultDataSource.Factory(this, http))
            .setLoadErrorHandlingPolicy(DefaultLoadErrorHandlingPolicy(2))
        val buffering = DefaultLoadControl.Builder().setBufferDurationsMs(8000, 25000, 1000, 2500)
            .setPrioritizeTimeOverSizeThresholds(true).build()
        val instance = ExoPlayer.Builder(this).setMediaSourceFactory(mediaFactory).setLoadControl(buffering)
            .setBandwidthMeter(DefaultBandwidthMeter.Builder(this).setInitialBitrateEstimate(1500000L).build()).build()
        instance.setAudioAttributes(AudioAttributes.DEFAULT, true)
        player = instance
        playerView?.player = instance
        instance.trackSelectionParameters = instance.trackSelectionParameters.buildUpon()
            .setMaxVideoSize(Int.MAX_VALUE, preferences.getInt("maxHeight", Int.MAX_VALUE))
            .setPreferredVideoMimeTypes(MimeTypes.VIDEO_H264).build()
        instance.addAnalyticsListener(object : AnalyticsListener {
            override fun onLoadError(eventTime: AnalyticsListener.EventTime, loadEventInfo: LoadEventInfo,
                mediaLoadData: MediaLoadData, error: IOException, wasCanceled: Boolean) {
                if (player !== instance || wasCanceled) return
                playbackStage = when (mediaLoadData.dataType) {
                    C.DATA_TYPE_MANIFEST -> "manifiesto"
                    C.DATA_TYPE_MEDIA -> "segmento de video/audio"
                    C.DATA_TYPE_DRM -> "licencia"
                    else -> "recurso multimedia"
                }
            }
        })
        instance.addListener(object : Player.Listener {
            override fun onRenderedFirstFrame() {
                if (player === instance && firstFrameMs == null) firstFrameMs = SystemClock.elapsedRealtime() - playbackStartedAt
            }
            override fun onPlaybackStateChanged(state: Int) {
                if (player !== instance) return
                if (state == Player.STATE_READY) { broadcastHasPlayed = true; startupWatchdog?.let { handler.removeCallbacks(it) }; startupWatchdog = null }
                playerStatus?.text = when (state) {
                    Player.STATE_BUFFERING -> "Cargando ${source.label}…"
                    Player.STATE_READY -> "${source.provider} · OK: controles · Atrás: catálogo"
                    Player.STATE_ENDED -> "La transmisión ha terminado."
                    else -> "Preparando señal…"
                }
            }
            override fun onPlayerError(error: PlaybackException) {
                if (player !== instance) return
                showWatchChrome(true)
                var cause: Throwable? = error
                var status: Int? = null
                while (cause != null) {
                    if (cause is HttpDataSource.InvalidResponseCodeException) status = cause.responseCode
                    cause = cause.cause
                }
                playbackHttp = status; playbackError = error.errorCodeName
                val restricted = error.errorCode in 6000..6999 || error.errorCode in 4000..4999
                if (BroadcastStartup.canRetry(source.waitForBroadcast, status, broadcastHasPlayed, broadcastAttempts, System.currentTimeMillis() - broadcastStartedAt) && instance.playWhenReady) {
                    broadcastAttempts++
                    resumePlayback = instance.playWhenReady
                    playerStatus?.text = "Esperando transmisión OBS / MediaMTX · Intento $broadcastAttempts de 3"
                    broadcastRetry = Runnable { if (active && selected?.id == item.id && player === instance) startPlayer(true) }
                        .also { handler.postDelayed(it, 2000) }
                } else if (PlaybackPolicy.canFailover(selected?.autoFailover == true, status, restricted) && sourceIndex + 1 < (selected?.sources?.size ?: item.sources.size)) {
                    resumePlayback = instance.playWhenReady
                    sourceIndex++
                    handler.post { if (active && selected?.id == item.id && player === instance) startPlayer() }
                } else {
                    playerStatus?.text = PlaybackPolicy.errorMessage(status, playbackStage, error.errorCodeName)
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        })
        val media = MediaItem.Builder().setUri(source.url)
        PlaybackPolicy.mimeType(source)?.let { media.setMimeType(it) }
        instance.setMediaItem(media.build())
        instance.prepare()
        instance.playWhenReady = resumePlayback
        startupWatchdog = Runnable {
            if (player === instance && instance.playWhenReady && instance.playbackState == Player.STATE_BUFFERING) {
                if (selected?.autoFailover == true && sourceIndex + 1 < (selected?.sources?.size ?: item.sources.size)) {
                    sourceIndex++; startPlayer()
                } else {
                    instance.stop()
                    playerStatus?.text = "La señal no respondió a tiempo. Pulsa Reintentar o cambia de señal."
                    showWatchChrome(true)
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        }.also { handler.postDelayed(it, if (source.waitForBroadcast) (30000L - (System.currentTimeMillis() - broadcastStartedAt)).coerceAtLeast(1L) else 18000L) }
        playerView?.requestFocus()
    }

    private fun releasePlayer() {
        cancelRemotePress()
        broadcastRetry?.let { handler.removeCallbacks(it) }; broadcastRetry = null
        startupWatchdog?.let { handler.removeCallbacks(it) }; startupWatchdog = null
        playerView?.player = null
        player?.release(); player = null; playerView = null; playingSource = null
        embedded?.close(); embedded = null
        videoHost?.removeAllViews()
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun closePlayer() {
        cancelResolution()
        releasePlayer(); selected = null; videoHost = null; watchHeader = null; playerStatus = null; watchChrome = null; watchMenu = null; watchCompetition = null
        handler.removeCallbacks(hideChrome)
        applyImmersive()
        render(returnFocus)
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        val watching = selected != null
        val wasHidden = watching && !chromeVisible
        if (watching && chromeVisible) {
            handler.removeCallbacks(hideChrome)
            handler.postDelayed(hideChrome, 5000)
        }
        val handled = super.dispatchTouchEvent(event)
        if (wasHidden && event.actionMasked == MotionEvent.ACTION_UP && selected != null) showWatchChrome(true)
        return handled
    }

    private fun cancelRemotePress() {
        handler.removeCallbacks(heldOk); pendingOk = null; remotePress.cancel()
    }

    private fun showRemoteOptions() {
        embedded?.exitFullscreen(); applyImmersive(); showWatchChrome(true)
        window.decorView.findViewWithTag<View>("watch:back")?.requestFocus()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode in listOf(KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER) &&
            (pendingOk != null || (selected != null && !chromeVisible))) {
            if (event.action == KeyEvent.ACTION_DOWN && remotePress.down()) {
                pendingOk = KeyEvent(event); handler.postDelayed(heldOk, 650)
            } else if (event.action == KeyEvent.ACTION_UP) {
                handler.removeCallbacks(heldOk)
                val down = pendingOk; pendingOk = null
                if (remotePress.up() == RemotePress.Result.CLICK && down != null) {
                    super.dispatchKeyEvent(down); super.dispatchKeyEvent(event)
                }
            }
            return true
        }
        if (selected != null && !chromeVisible && embedded?.isPointerActive() != true &&
            event.keyCode == KeyEvent.KEYCODE_DPAD_UP && event.action == KeyEvent.ACTION_DOWN) {
            showRemoteOptions(); return true
        }
        if (selected != null && chromeVisible && event.action == KeyEvent.ACTION_DOWN) {
            handler.removeCallbacks(hideChrome)
            handler.postDelayed(hideChrome, 5000)
        }
        if (selected != null && event.keyCode == KeyEvent.KEYCODE_MENU) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                if (embedded?.exitFullscreen() == true) { applyImmersive(); showWatchChrome(true) }
                else showWatchChrome(!chromeVisible)
                if (chromeVisible) window.decorView.findViewWithTag<View>("watch:back")?.requestFocus()
            }
            return true
        }
        if (selected != null && event.keyCode in listOf(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_MEDIA_PLAY, KeyEvent.KEYCODE_MEDIA_PAUSE)) {
            if (player != null) {
                if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) player?.let {
                    it.playWhenReady = when (event.keyCode) {
                        KeyEvent.KEYCODE_MEDIA_PLAY -> true
                        KeyEvent.KEYCODE_MEDIA_PAUSE -> false
                        else -> !it.playWhenReady
                    }
                }
                return true
            }
            if (embedded != null && selected?.sources?.getOrNull(sourceIndex)?.provider == "YouTube") {
                if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) embedded?.mediaKey(when(event.keyCode) {
                    KeyEvent.KEYCODE_MEDIA_PLAY -> true
                    KeyEvent.KEYCODE_MEDIA_PAUSE -> false
                    else -> null
                })
                return true
            }
        }
        if (selected?.channel == true && preferences.getBoolean("channelKeys", true) &&
            event.keyCode in listOf(KeyEvent.KEYCODE_CHANNEL_UP, KeyEvent.KEYCODE_CHANNEL_DOWN)) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                val playable = channels.filter { it.sources.isNotEmpty() }
                val index = playable.indexOfFirst { it.id == selected?.id }
                if (index >= 0 && playable.isNotEmpty()) {
                    val step = if (event.keyCode == KeyEvent.KEYCODE_CHANNEL_UP) 1 else -1
                    open(playable[(index + step + playable.size) % playable.size])
                }
            }
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    @Deprecated("Compatible with Android TV remotes on API 23+")
    override fun onBackPressed() {
        cancelRemotePress()
        if (embedded?.exitFullscreen() == true) { applyImmersive(); return }
        if (selected != null && chromeVisible) { showWatchChrome(false); return }
        if (selected != null) { closePlayer(); return }
        if (section != "Inicio" || query.isNotBlank()) { section = "Inicio"; query = ""; page = 0; render(); return }
        AlertDialog.Builder(this).setTitle("¿Salir de GolBoliviaLive?")
            .setPositiveButton("Salir") { _, _ -> finish() }.setNegativeButton("Seguir viendo", null).show()
    }
}
