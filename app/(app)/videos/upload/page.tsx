import { Header } from "@/components/layout/Header";
import { VideoUpload } from "@/components/video/VideoUpload";

export default function UploadPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Subir video"
        description="Agregá un nuevo video de capacitación al repositorio"
      />
      <div className="p-6">
        <VideoUpload />
      </div>
    </div>
  );
}
