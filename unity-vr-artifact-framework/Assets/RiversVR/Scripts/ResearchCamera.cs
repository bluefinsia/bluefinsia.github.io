using System;
using System.IO;
using UnityEngine;

namespace RiversVR
{
    /// <summary>
    /// Attach to Research Camera Service and assign the tracked head camera. Captures an
    /// independent mono view: never call Render on the HMD camera or read its stereo buffer.
    /// The built-in rendering pipeline is required by this simple camera.Render example.
    /// </summary>
    public class ResearchCamera : MonoBehaviour
    {
        public Camera head;
        [Range(256, 2048)] public int width = 1024;
        [Range(256, 2048)] public int height = 768;
        private Camera photoCamera;

        public bool TryCapture(string artifactName, out string path)
        {
            path = null;
            if (head == null)
                return false;
            RenderTexture target = null;
            Texture2D image = null;
            RenderTexture previous = RenderTexture.active;
            try
            {
                if (photoCamera == null)
                {
                    GameObject cameraObject = new GameObject("Mono Research Photo Camera");
                    cameraObject.transform.SetParent(transform, false);
                    photoCamera = cameraObject.AddComponent<Camera>();
                }
                photoCamera.CopyFrom(head);
                photoCamera.enabled = false;
                photoCamera.stereoTargetEye = StereoTargetEyeMask.None;
                photoCamera.transform.SetPositionAndRotation(head.transform.position, head.transform.rotation);
                photoCamera.cullingMask = head.cullingMask & ~(1 << 5); // Exclude the UI layer.
                photoCamera.fieldOfView = 60f;
                photoCamera.aspect = (float)width / height;
                photoCamera.rect = new Rect(0f, 0f, 1f, 1f);
                photoCamera.ResetProjectionMatrix();
                target = RenderTexture.GetTemporary(width, height, 24, RenderTextureFormat.ARGB32);
                photoCamera.targetTexture = target;
                photoCamera.Render();
                RenderTexture.active = target;
                image = new Texture2D(width, height, TextureFormat.RGB24, false);
                image.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                image.Apply();

                string safeName = artifactName ?? "artifact";
                foreach (char character in Path.GetInvalidFileNameChars())
                    safeName = safeName.Replace(character, '_');
                string directory = Path.Combine(Application.persistentDataPath, "ResearchPhotos");
                Directory.CreateDirectory(directory);
                path = Path.Combine(directory, DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff") + "-" + safeName + ".png");
                File.WriteAllBytes(path, image.EncodeToPNG());
                return true;
            }
            catch (Exception exception)
            {
                Debug.LogException(exception, this);
                return false;
            }
            finally
            {
                // Restore render state even on failure; a photo must not hijack headset output.
                RenderTexture.active = previous;
                if (photoCamera != null)
                    photoCamera.targetTexture = null;
                if (target != null)
                    RenderTexture.ReleaseTemporary(target);
                if (image != null)
                    Destroy(image);
            }
        }
    }
}
