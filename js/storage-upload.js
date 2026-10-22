import { storage } from './firebase-config.js';
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

export async function uploadImageFile(file, folder = 'uploads') {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${folder}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
