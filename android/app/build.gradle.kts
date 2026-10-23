plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.golbolivialive.tv"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.golbolivialive.tv"
        minSdk = 23
        targetSdk = 35
        versionCode = 3
        versionName = "0.2.1"
        buildConfigField("String", "PUBLIC_BASE_URL", "\"https://golbolivialive-beta.vercel.app\"")
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.5.1")
    implementation("androidx.media3:media3-ui:1.5.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
