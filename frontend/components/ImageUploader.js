// components/ImageUploader.js
"use client";
import { useState } from "react";
import api from "@/lib/api";

export default function ImageUploader({ onUpload }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview]     = useState(null);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // show local preview immediately
        setPreview(URL.createObjectURL(file));
        setUploading(true);

        const formData = new FormData();
        formData.append("image", file);

        try {
            const res = await api.post("/products/upload-image/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            onUpload(res.data.data.url); // pass the Cloudinary URL up
        } catch (err) {
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            {preview && <img src={preview} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />}
            <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
            {uploading && <span>Uploading...</span>}
        </div>
    );
}