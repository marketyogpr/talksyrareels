/**
 * 📱 TALKSYRA REELS - POST & REEL UPLOAD API INTEGRATION
 * यह script APK में directly copy-paste करके use कर सकते हैं
 *
 * Features:
 * ✅ Regular Posts (Text/Image)
 * ✅ Reels (Video Upload)
 * ✅ Stories (Video)
 * ✅ Error Handling
 * ✅ Progress Tracking
 * ✅ File Validation
 */

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MultipartBody
import okhttp3.logging.HttpLoggingInterceptor
import java.io.File
import java.util.concurrent.TimeUnit
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName

// =============================================================================
// 📊 DATA CLASSES FOR API RESPONSES
// =============================================================================

data class PostResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("postId") val postId: String? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("error") val error: String? = null
)

data class UploadProgress(
    val progress: Int, // 0-100
    val status: String, // "uploading", "processing", "completed", "error"
    val message: String
)

// =============================================================================
// 🎬 TALKSYRA UPLOAD MANAGER - MAIN CLASS
// =============================================================================

class TalksyraUploadManager(
    private val baseUrl: String = "https://your-api-domain.com",
    private val enableLogging: Boolean = true
) {

    private val gson = Gson()
    private val client = createHttpClient()

    private fun createHttpClient(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(120, TimeUnit.SECONDS)

        if (enableLogging) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            builder.addInterceptor(logging)
        }

        return builder.build()
    }

    // =============================================================================
    // 📝 REGULAR POST UPLOAD (TEXT ONLY)
    // =============================================================================

    suspend fun uploadPost(
        userId: String,
        caption: String,
        visibility: String = "public",
        onProgress: ((UploadProgress) -> Unit)? = null
    ): Result<PostResponse> {
        return try {
            onProgress?.invoke(UploadProgress(10, "preparing", "Preparing post data..."))

            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("user_id", userId)
                .addFormDataPart("type", "post")
                .addFormDataPart("caption", caption)
                .addFormDataPart("visibility", visibility)
                .build()

            onProgress?.invoke(UploadProgress(30, "uploading", "Uploading post..."))

            val request = Request.Builder()
                .url("$baseUrl/api/posts/create")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()

            onProgress?.invoke(UploadProgress(80, "processing", "Processing response..."))

            val responseBody = response.body?.string()
            val postResponse = gson.fromJson(responseBody, PostResponse::class.java)

            if (response.isSuccessful && postResponse.success) {
                onProgress?.invoke(UploadProgress(100, "completed", "Post uploaded successfully!"))
                Result.success(postResponse)
            } else {
                val errorMsg = postResponse.error ?: "Unknown error occurred"
                onProgress?.invoke(UploadProgress(0, "error", errorMsg))
                Result.failure(Exception(errorMsg))
            }

        } catch (e: Exception) {
            onProgress?.invoke(UploadProgress(0, "error", "Upload failed: ${e.message}"))
            Result.failure(e)
        }
    }

    // =============================================================================
    // 🎬 REEL UPLOAD (VIDEO)
    // =============================================================================

    suspend fun uploadReel(
        userId: String,
        videoFile: File,
        caption: String = "",
        visibility: String = "public",
        videoWidth: Int = 1080,
        videoHeight: Int = 1920,
        videoDuration: Float = 0f,
        onProgress: ((UploadProgress) -> Unit)? = null
    ): Result<PostResponse> {
        return try {
            // Validate video file
            if (!videoFile.exists()) {
                return Result.failure(Exception("Video file does not exist"))
            }

            if (videoFile.length() == 0L) {
                return Result.failure(Exception("Video file is empty"))
            }

            // Check file size (max 100MB for Cloudflare)
            val maxSize = 100 * 1024 * 1024L // 100MB
            if (videoFile.length() > maxSize) {
                return Result.failure(Exception("Video file too large. Max size: 100MB"))
            }

            onProgress?.invoke(UploadProgress(5, "validating", "Validating video file..."))

            // Determine MIME type
            val mimeType = when (videoFile.extension.lowercase()) {
                "mp4" -> "video/mp4"
                "mov" -> "video/quicktime"
                "avi" -> "video/x-msvideo"
                "mkv" -> "video/x-matroska"
                else -> "video/mp4" // default
            }

            onProgress?.invoke(UploadProgress(15, "preparing", "Preparing video upload..."))

            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("user_id", userId)
                .addFormDataPart("type", "reel")
                .addFormDataPart("caption", caption)
                .addFormDataPart("visibility", visibility)
                .addFormDataPart("duration", videoDuration.toString())
                .addFormDataPart("width", videoWidth.toString())
                .addFormDataPart("height", videoHeight.toString())
                .addFormDataPart(
                    "video",
                    videoFile.name,
                    videoFile.asRequestBody(mimeType.toMediaTypeOrNull())
                )
                .build()

            onProgress?.invoke(UploadProgress(25, "uploading", "Uploading video..."))

            val request = Request.Builder()
                .url("$baseUrl/api/posts/create")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()

            onProgress?.invoke(UploadProgress(90, "processing", "Processing video..."))

            val responseBody = response.body?.string()
            val postResponse = gson.fromJson(responseBody, PostResponse::class.java)

            if (response.isSuccessful && postResponse.success) {
                onProgress?.invoke(UploadProgress(100, "completed", "Reel uploaded successfully!"))
                Result.success(postResponse)
            } else {
                val errorMsg = postResponse.error ?: "Upload failed"
                onProgress?.invoke(UploadProgress(0, "error", errorMsg))
                Result.failure(Exception(errorMsg))
            }

        } catch (e: Exception) {
            onProgress?.invoke(UploadProgress(0, "error", "Upload failed: ${e.message}"))
            Result.failure(e)
        }
    }

    // =============================================================================
    // 📖 STORY UPLOAD (VIDEO)
    // =============================================================================

    suspend fun uploadStory(
        userId: String,
        videoFile: File,
        caption: String = "",
        videoWidth: Int = 1080,
        videoHeight: Int = 1920,
        videoDuration: Float = 0f,
        onProgress: ((UploadProgress) -> Unit)? = null
    ): Result<PostResponse> {
        return try {
            onProgress?.invoke(UploadProgress(10, "preparing", "Preparing story..."))

            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("user_id", userId)
                .addFormDataPart("type", "story")
                .addFormDataPart("caption", caption)
                .addFormDataPart("visibility", "public") // Stories are always public
                .addFormDataPart("duration", videoDuration.toString())
                .addFormDataPart("width", videoWidth.toString())
                .addFormDataPart("height", videoHeight.toString())
                .addFormDataPart(
                    "video",
                    videoFile.name,
                    videoFile.asRequestBody("video/mp4".toMediaTypeOrNull())
                )
                .build()

            onProgress?.invoke(UploadProgress(30, "uploading", "Uploading story..."))

            val request = Request.Builder()
                .url("$baseUrl/api/posts/create")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()

            onProgress?.invoke(UploadProgress(80, "processing", "Processing story..."))

            val responseBody = response.body?.string()
            val postResponse = gson.fromJson(responseBody, PostResponse::class.java)

            if (response.isSuccessful && postResponse.success) {
                onProgress?.invoke(UploadProgress(100, "completed", "Story uploaded successfully!"))
                Result.success(postResponse)
            } else {
                val errorMsg = postResponse.error ?: "Story upload failed"
                onProgress?.invoke(UploadProgress(0, "error", errorMsg))
                Result.failure(Exception(errorMsg))
            }

        } catch (e: Exception) {
            onProgress?.invoke(UploadProgress(0, "error", "Upload failed: ${e.message}"))
            Result.failure(e)
        }
    }
}

// =============================================================================
// 🎯 USAGE EXAMPLES - HOW TO USE IN YOUR APK
// =============================================================================

/*
class MainActivity : AppCompatActivity() {

    private val uploadManager = TalksyraUploadManager(
        baseUrl = "https://your-api-domain.com",
        enableLogging = true
    )

    // Example 1: Upload Regular Post
    private fun uploadTextPost() {
        val userId = "user123"

        lifecycleScope.launch {
            val result = uploadManager.uploadPost(
                userId = userId,
                caption = "Hello World! This is my first post!",
                visibility = "public"
            ) { progress ->
                // Update UI with progress
                updateProgressUI(progress)
            }

            result.onSuccess { response ->
                Toast.makeText(this@MainActivity, "Post uploaded!", Toast.LENGTH_SHORT).show()
                Log.d("Upload", "Post ID: ${response.postId}")
            }.onFailure { error ->
                Toast.makeText(this@MainActivity, "Upload failed: ${error.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Example 2: Upload Reel
    private fun uploadVideoReel() {
        val userId = "user123"
        val videoFile = File("/path/to/video.mp4") // Get from gallery/camera

        lifecycleScope.launch {
            val result = uploadManager.uploadReel(
                userId = userId,
                videoFile = videoFile,
                caption = "Check out this amazing video!",
                visibility = "public",
                videoWidth = 1080,
                videoHeight = 1920,
                videoDuration = 15.5f
            ) { progress ->
                updateProgressUI(progress)
            }

            result.onSuccess { response ->
                Toast.makeText(this@MainActivity, "Reel uploaded!", Toast.LENGTH_SHORT).show()
            }.onFailure { error ->
                Toast.makeText(this@MainActivity, "Upload failed: ${error.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Example 3: Upload Story
    private fun uploadStory() {
        val userId = "user123"
        val videoFile = File("/path/to/story.mp4")

        lifecycleScope.launch {
            val result = uploadManager.uploadStory(
                userId = userId,
                videoFile = videoFile,
                caption = "Quick story update!",
                videoWidth = 1080,
                videoHeight = 1920,
                videoDuration = 10.0f
            ) { progress ->
                updateProgressUI(progress)
            }

            result.onSuccess { response ->
                Toast.makeText(this@MainActivity, "Story uploaded!", Toast.LENGTH_SHORT).show()
            }.onFailure { error ->
                Toast.makeText(this@MainActivity, "Upload failed: ${error.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateProgressUI(progress: UploadProgress) {
        runOnUiThread {
            progressBar.progress = progress.progress
            statusText.text = progress.message

            when (progress.status) {
                "completed" -> {
                    progressBar.visibility = View.GONE
                    successIcon.visibility = View.VISIBLE
                }
                "error" -> {
                    progressBar.visibility = View.GONE
                    errorIcon.visibility = View.VISIBLE
                }
                else -> {
                    progressBar.visibility = View.VISIBLE
                    successIcon.visibility = View.GONE
                    errorIcon.visibility = View.GONE
                }
            }
        }
    }
}
*/

// =============================================================================
// 📦 DEPENDENCIES TO ADD IN build.gradle (app level)
// =============================================================================

/*
dependencies {
    // OkHttp for network requests
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'

    // Gson for JSON parsing
    implementation 'com.google.code.gson:gson:2.10.1'

    // Coroutines for async operations
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'

    // Lifecycle components
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2'
    implementation 'androidx.lifecycle:lifecycle-livedata-ktx:2.6.2'
}
*/

// =============================================================================
// ⚙️ PERMISSIONS TO ADD IN AndroidManifest.xml
// =============================================================================

/*
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
*/

// =============================================================================
// 🎨 UI EXAMPLE - UPLOAD SCREEN
// =============================================================================

/*
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp">

    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Upload Post/Reel"
        android:textSize="24sp"
        android:textStyle="bold"
        android:gravity="center"
        android:layout_marginBottom="24dp" />

    <EditText
        android:id="@+id/captionEditText"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Enter caption..."
        android:minLines="3"
        android:layout_marginBottom="16dp" />

    <Button
        android:id="@+id/selectVideoButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Select Video"
        android:layout_marginBottom="16dp" />

    <Button
        android:id="@+id/uploadPostButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Upload as Post"
        android:layout_marginBottom="8dp" />

    <Button
        android:id="@+id/uploadReelButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Upload as Reel"
        android:layout_marginBottom="8dp" />

    <Button
        android:id="@+id/uploadStoryButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Upload as Story"
        android:layout_marginBottom="24dp" />

    <ProgressBar
        android:id="@+id/progressBar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:visibility="gone"
        android:layout_marginBottom="8dp" />

    <TextView
        android:id="@+id/statusText"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Ready to upload"
        android:gravity="center" />

</LinearLayout>
*/

println("🎉 TALKSYRA UPLOAD MANAGER - READY TO USE!")
println("📋 Copy-paste this entire script into your APK project")
println("🔧 Update baseUrl with your actual API domain")
println("🚀 Start uploading posts and reels!")