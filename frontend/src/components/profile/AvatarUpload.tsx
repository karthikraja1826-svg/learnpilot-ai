import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { resolveMediaUrl } from '../../utils/media';
import { ApiRequestError } from '../../services/api';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function AvatarUpload() {
  const { profile, uploadProfilePhoto, removeProfilePhoto } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Please choose a JPEG, PNG, or WebP image.', 'error');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      showToast('Image must be smaller than 5MB.', 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setIsUploading(true);

    try {
      await uploadProfilePhoto(file);
      showToast('Profile photo updated.', 'success');
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : 'Could not upload your photo. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(previewUrl);
      setLocalPreview(null);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeProfilePhoto();
      showToast('Profile photo removed.', 'success');
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : 'Could not remove your photo. Please try again.', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const displayImageUrl = localPreview ?? resolveMediaUrl(profile?.profileImage);
  const isBusy = isUploading || isRemoving;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={profile?.name ?? profile?.email} imageUrl={displayImageUrl} size="lg" />
        {isBusy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm font-medium text-text-primary transition-colors duration-250 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
            {profile?.profileImage ? 'Change photo' : 'Upload photo'}
          </button>

          {profile?.profileImage && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm font-medium text-error transition-colors duration-250 hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
        <p className="text-caption">JPEG, PNG, or WebP. Up to 5MB.</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
