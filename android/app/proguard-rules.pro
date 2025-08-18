# ------------------------
# Prevent code shrinking of Google Sign-In
# ------------------------
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# ------------------------
# Keep React Native bridge classes
# ------------------------
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule { *; }

# ------------------------
# For React Native DateTimePicker
# ------------------------
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# ------------------------
# Prevent stripping of React Native Views (e.g. used by Paper/TextInput)
# ------------------------
-keep class com.facebook.react.views.textinput.** { *; }
-keep class com.facebook.react.views.view.ReactViewManager { *; }

# ------------------------
# Keep native modules safe
# ------------------------
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}

# ------------------------
# General Android keep rules (just to be safe)
# ------------------------
-keep class android.support.v7.** { *; }
-keep class androidx.** { *; }
-dontwarn android.support.**
-dontwarn androidx.**

# ------------------------
# Optional: Keep everything in your app's package (you can limit this later)
# ------------------------
-keep class com.pragyavani.salonmanagement.** { *; }
