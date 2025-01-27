import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-storage.js";
import { collection, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

import { storage, firestore } from "./firebase-config.js";
// import { } from 'https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js';

// PREVIEW THUMBNAIL-------------------------------
const thumbnailPreviewSection = document.getElementById('thumbnail-preview-section');
const thumbnailInputZone = document.getElementById('thumbnail-input-zone');
const thumbnailInput = document.getElementById('input-thumbnail');
const filenameLabel = document.getElementById('filename');
const thumbnailContainer = document.getElementById('thumbnail-container');

thumbnailPreviewSection.onclick = (e) => {
    e.preventDefault();
    thumbnailInput.click();
}

thumbnailInput.addEventListener('change', (event) => {
    const file = event.target.files[0];

    if (file) {
        filenameLabel.textContent = file.name;

        const reader = new FileReader();
        reader.onload = (e) => {
            thumbnailContainer.innerHTML =
            `<img src="${e.target.result}" class="object-cover" alt="Image preview"/>`;
            thumbnailPreviewSection.classList.remove('border-dashed', 'border-2', 'border-gray-400');
            thumbnailInputZone.style.display = "none";
        };
        reader.readAsDataURL(file);
    } else {
    filenameLabel.textContent = '';
    thumbnailContainer.innerHTML =
        `<div class="bg-gray-200 h-48 rounded-lg flex items-center justify-center text-gray-500">No image preview</div>`;
    thumbnailPreviewSection.classList.add('border-dashed', 'border-2', 'border-gray-400');
    thumbnailInputZone.style.display = "none";
    }
});

thumbnailInput.addEventListener('click', (event) => {
    event.stopPropagation();
});

// UPDATE STORAGE-------------------------------
document.addEventListener('DOMContentLoaded', function() {
    const btnConfirmPublish = document.getElementById("btn-confirm-publish");

    // Lắng nghe sự kiện click cho nút publish
    btnConfirmPublish.addEventListener('click', function() {
        const title = document.getElementById("input-title").value;
        const description = document.getElementById("input-description").value;
        const artist = localStorage.getItem("username");

        // Define object to be uploaded to Firestore
        const data = {
            date: Date.now(),
            title,
            description,
            thumbnail: "",
            track: "",
            // uid: auth.currentUser.uid,
            artist,
        }

        // Đặt tên cho thư mục con (child folder) trong dịch vụ lưu trữ
        const audioFolder = 'audio';
        const thumbnailFolder = 'thumbnail';

        // Ref to child folder
        const storageRefAudio = ref(storage, audioFolder);
        const storageRefThumbnail = ref(storage, thumbnailFolder);

        // Chọn file mp3,v từ người dùng
        const trackFile = document.getElementById('input-track').files[0];
        const thumbnailFile = document.getElementById('input-thumbnail').files[0];
        
        // Check if track and img is uploaded
        if (trackFile && thumbnailFile && title && description) {
            alert("Publication may take some seconds. Click OK to proceed.");

            // Tạo một mảng các promises cho việc tải lên track và thumbnail
            const uploadPromises = [];
        
            // Tạo một promise cho việc tải track
            const trackUploadPromise = new Promise((resolve, reject) => {
                const uploadTrackTask = uploadBytesResumable(ref(storageRefAudio, `${title} - ${artist}.mp3`), trackFile);
                uploadTrackTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('Track uploading: ' + progress + '% done');
                    },
                    (error) => reject(error),
                    () => {
                        getDownloadURL(uploadTrackTask.snapshot.ref)
                            .then((downloadURL) => {
                                console.log('Track uploaded successfully! Download URL:', downloadURL);
                                data["track"] = downloadURL;
                                resolve();
                            })
                            .catch((error) => reject(error));
                    }
                );
            });
            uploadPromises.push(trackUploadPromise);
        
            // Tạo một promise cho việc tải lên thumbnail
            const thumbnailUploadPromise = new Promise((resolve, reject) => {
                const uploadThumbnailTask = uploadBytesResumable(ref(storageRefThumbnail, `${title} - ${artist}.jpg`), thumbnailFile);
                uploadThumbnailTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('Thumbnail uploading: ' + progress + '% done');
                    },
                    (error) => reject(error),
                    () => {
                        getDownloadURL(uploadThumbnailTask.snapshot.ref)
                            .then((downloadURL) => {
                                console.log('Thumbnail uploaded successfully! Download URL:', downloadURL);
                                data["thumbnail"] = downloadURL;
                                resolve();
                            })
                            .catch((error) => reject(error));
                    }
                );
            });
            uploadPromises.push(thumbnailUploadPromise);
        
            // Chờ cho cả hai tải lên hoàn thành r tải lên Firestore
            const upload = new Promise((resolve, reject) => {
                Promise.all(uploadPromises)
                    .then(() => {
                        // Sau khi cả hai tải lên hoàn thành, tiến hành upload vào Firestore
                        const colRef = collection(firestore, "songs");
                        addDoc(colRef, data)
                            .then(() => {
                                alert("Publish new work successfully.");
                                resolve();
                            })
                            .catch((error) => {
                                alert("Error uploading data to Firestore:", error);
                                reject();
                            });
            
                        // Kiểm tra Firestore
                        onSnapshot(colRef, (snapshot) => {
                            const output = [];
                            snapshot.docs.forEach((doc) => {
                                output.push({...doc.data()});
                            });
                            console.log(output);
                        });
                        
                    })
                    .catch((error) => {
                        console.error("Error uploading files:", error);
                        reject();
                    });
            })

            upload.then(() => {
                // Redirect
                window.location.href = "library.html";
            })
        
        } else {
            alert('Please fill in all fields.');
        }
    })
});