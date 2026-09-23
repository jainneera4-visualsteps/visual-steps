import { apiFetch } from '../utils/api';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { AlertCircle, ArrowLeft, Camera, HelpCircle, UserRound, Mic, Square, Volume2, ImagePlus } from 'lucide-react';
import { getRewardIcon } from '../utils/rewardUtils';

const illustratedAvatars = [
  ['Bright blue', 'https://api.dicebear.com/7.x/micah/svg?seed=Oliver&backgroundColor=b6e3f4'],
  ['Warm peach', 'https://api.dicebear.com/7.x/micah/svg?seed=Willow&backgroundColor=ffdfbf'],
  ['Soft green', 'https://api.dicebear.com/7.x/micah/svg?seed=River&backgroundColor=c0aede'],
  ['Sunny yellow', 'https://api.dicebear.com/7.x/micah/svg?seed=Sam&backgroundColor=ffd5dc'],
  ['Calm purple', 'https://api.dicebear.com/7.x/micah/svg?seed=Alex&backgroundColor=d1d4f9'],
  ['Fresh mint', 'https://api.dicebear.com/7.x/micah/svg?seed=Jamie&backgroundColor=c1f4d0'],
];

const characterAvatars = [
  ['Adventurer Max', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Max'],
  ['Adventurer Lily', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily'],
  ['Adventurer Sky', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sky'],
  ['Adventurer Robin', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Robin'],
  ['Adventurer Ari', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ari'],
  ['Adventurer Casey', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Casey'],
];

const presetAvatarUrls = new Set([...illustratedAvatars, ...characterAvatars].map(([, url]) => url));
type AvatarChoice = 'initials' | 'photo' | 'illustrated' | 'character';

const rewardChoices = [
  { name: 'Token', icon: '🪙' },
  { name: 'Star', icon: '⭐' },
  { name: 'Sticker', icon: '🌟' },
  { name: 'Point', icon: '🏅' },
  { name: 'Coin', icon: '🟡' },
  { name: 'Penny', icon: '🪙' },
  { name: 'Cent', icon: '¢' },
  { name: 'Bead', icon: '🔵' },
  { name: 'Dollar', icon: '💵' },
  { name: 'Coffee', icon: '☕' },
  { name: 'Drink', icon: '🍹' },
  { name: 'Ticket', icon: '🎟️' },
  { name: 'Hour', icon: '⌛' },
  { name: 'Credit', icon: '💳' },
];

const themeChoices = [
  { id: 'sky', name: 'Simple', icon: '☁️', color: 'from-sky-100 to-blue-100' },
  { id: 'ocean', name: 'Ocean', icon: '🐬', color: 'from-cyan-100 to-blue-200' },
  { id: 'jungle', name: 'Jungle', icon: '🐒', color: 'from-lime-100 to-emerald-200' },
  { id: 'space', name: 'Space', icon: '🤖', color: 'from-indigo-100 to-violet-200' },
  { id: 'dino', name: 'Dinosaur', icon: '🦕', color: 'from-amber-100 to-orange-200' },
  { id: 'fairy', name: 'Fairy', icon: '🧚', color: 'from-pink-100 to-rose-200' },
  { id: 'sports', name: 'Sports', icon: '🏅', color: 'from-blue-100 to-indigo-200' },
  { id: 'art', name: 'Art', icon: '🎨', color: 'from-orange-100 to-pink-200' },
  { id: 'music', name: 'Music', icon: '🎵', color: 'from-purple-100 to-fuchsia-200' },
  { id: 'emerald', name: 'Nature', icon: '🐢', color: 'from-green-100 to-emerald-200' },
  { id: 'sunset', name: 'Sunset', icon: '🦊', color: 'from-yellow-100 to-orange-200' },
  { id: 'royal', name: 'Royal', icon: '🦉', color: 'from-purple-100 to-indigo-200' },
  { id: 'hero', name: 'Hero', icon: '🦸', color: 'from-red-100 to-blue-200' },
  { id: 'safari', name: 'Safari', icon: '🦁', color: 'from-orange-100 to-lime-200' },
  { id: 'construction', name: 'Building', icon: '🚜', color: 'from-yellow-100 to-amber-200' },
];

const avatarChoiceFor = (avatar: string): AvatarChoice => {
  if (!avatar) return 'initials';
  if (illustratedAvatars.some(([, url]) => url === avatar)) return 'illustrated';
  if (characterAvatars.some(([, url]) => url === avatar)) return 'character';
  return 'photo';
};

const prepareAvatarForUpload = (file: File): Promise<File> => new Promise((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  const cleanup = () => URL.revokeObjectURL(objectUrl);
  image.onerror = () => {
    cleanup();
    reject(new Error('This photo format could not be read. Please choose a JPEG, PNG, WebP, GIF, or another photo supported by your browser.'));
  };
  image.onload = () => {
    try {
      const maxDimension = 1200;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare this photo');

      // Avatars do not need transparency. A solid background prevents a PNG
      // with transparency from becoming black when converted to JPEG.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        cleanup();
        if (!blob) {
          reject(new Error('Your browser could not prepare this photo'));
          return;
        }
        resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    } catch (avatarError) {
      cleanup();
      reject(avatarError);
    }
  };
  image.src = objectUrl;
});

const emptyProfileForm = () => ({
  name: '', dob: '', gradeLevel: '', behavioralIssues: '', therapies: '', hobbies: '', interests: '', strengths: '', weaknesses: '', sensoryIssues: '', avatar: '', startTime: '', endTime: '', maxIncompleteLimit: '', rewardType: 'Token', rewardIcon: '', bonusHistoryLimit: '5', theme: 'sky', themeCompanionStyle: 'character', helpCommunicationMethod: 'spoken', helpPromptText: 'Help please', helpPromptAudioUrl: '', helpSignImageUrl: '', helpCardImageUrl: '', canPrint: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, kidCode: '',
});

export default function AddEditKid() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isRewardIconUploading, setIsRewardIconUploading] = useState(false);
  const [isHelpMediaUploading, setIsHelpMediaUploading] = useState(false);
  const [isRecordingHelp, setIsRecordingHelp] = useState(false);
  const helpRecorderRef = useRef<MediaRecorder | null>(null);
  const helpRecorderStreamRef = useRef<MediaStream | null>(null);
  const helpRecognitionRef = useRef<any>(null);
  const helpTranscriptRef = useRef('');
  const [avatarChoice, setAvatarChoice] = useState<AvatarChoice>('initials');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState(emptyProfileForm);

  useEffect(() => () => {
    helpRecognitionRef.current?.abort?.();
    helpRecorderStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setIsAvatarUploading(false);
    setIsRewardIconUploading(false);

    if (!isEditing) {
      setFormData(emptyProfileForm());
      setAvatarChoice('initials');
      setIsLoading(false);
      return () => { cancelled = true; };
    }

    setIsLoading(true);
    apiFetch(`/api/kids/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch kid details');
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          const kid = data.kid;
          setFormData({
            name: kid.name || '',
            dob: kid.dob || '',
            gradeLevel: kid.grade_level || '',
            behavioralIssues: kid.behavioral_issues || '',
            therapies: kid.therapies || '',
            hobbies: kid.hobbies || '',
            interests: kid.interests || '',
            strengths: kid.strengths || '',
            weaknesses: kid.weaknesses || '',
            sensoryIssues: kid.sensory_issues || '',
            avatar: kid.avatar || '',
            startTime: kid.start_time || '',
            endTime: kid.end_time || '',
            maxIncompleteLimit: kid.max_incomplete_limit || '',
            rewardType: kid.reward_type || 'Penny',
            rewardIcon: kid.reward_icon || '',
            bonusHistoryLimit: kid.bonus_history_limit?.toString() || '5',
            theme: kid.theme || 'sky',
            themeCompanionStyle: kid.theme_companion_style || 'character',
            helpCommunicationMethod: kid.help_communication_method || 'spoken',
            helpPromptText: kid.help_prompt_text || 'Help please',
            helpPromptAudioUrl: kid.help_prompt_audio_url || '',
            helpSignImageUrl: kid.help_sign_image_url || '',
            helpCardImageUrl: kid.help_card_image_url || '',
            canPrint: kid.can_print || false,
            timezone: kid.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            kidCode: kid.kid_code || '',
          });
          setAvatarChoice(avatarChoiceFor(kid.avatar || ''));
        })
        .catch((err) => { if (!cancelled) setError(err.message); })
        .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [isEditing, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value, ...(name === 'helpPromptText' && value !== prev.helpPromptText ? { helpPromptAudioUrl: '' } : {}) }));
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setIsAvatarUploading(true);
    setError('');
    const uploadData = new FormData();

    try {
      const preparedAvatar = await prepareAvatarForUpload(file);
      if (preparedAvatar.size > 5 * 1024 * 1024) {
        throw new Error('This photo is still too large after optimization. Please choose a smaller photo.');
      }
      uploadData.append('image', preparedAvatar);
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || 'Failed to upload avatar');
      }
      setFormData(prev => ({ ...prev, avatar: data.imageUrl }));
      setAvatarChoice('photo');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload avatar');
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleRewardIconUpload = async (file: File) => {
    setIsRewardIconUploading(true);
    setError('');
    try {
      const preparedIcon = await prepareAvatarForUpload(file);
      if (preparedIcon.size > 5 * 1024 * 1024) throw new Error('This icon is too large. Please choose a smaller image.');
      const uploadData = new FormData();
      uploadData.append('image', preparedIcon);
      const response = await apiFetch('/api/upload', { method: 'POST', body: uploadData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.imageUrl) throw new Error(data.error || 'Failed to upload reward icon');
      setFormData(prev => ({ ...prev, rewardIcon: data.imageUrl }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload reward icon');
    } finally {
      setIsRewardIconUploading(false);
    }
  };

  const uploadHelpImage = async (file: File, field: 'helpSignImageUrl' | 'helpCardImageUrl') => {
    setIsHelpMediaUploading(true);
    setError('');
    try {
      const preparedImage = await prepareAvatarForUpload(file);
      const uploadData = new FormData();
      uploadData.append('image', preparedImage);
      const response = await apiFetch('/api/upload', { method: 'POST', body: uploadData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.imageUrl) throw new Error(data.error || 'Failed to upload help image');
      setFormData(prev => ({ ...prev, [field]: data.imageUrl }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload help image');
    } finally {
      setIsHelpMediaUploading(false);
    }
  };

  const startHelpRecording = async () => {
    setError('');
    try {
      const SpeechRecognitionClass = (window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition
        || (window as typeof window & { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        throw new Error('This browser cannot create written words from a recording. Please use Chrome or Edge to record the phrase.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const recognition = new SpeechRecognitionClass();
      const chunks: Blob[] = [];
      helpTranscriptRef.current = '';
      setFormData(prev => ({ ...prev, helpPromptText: '', helpPromptAudioUrl: '' }));
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0]?.transcript || '';
        transcript = transcript.trim().slice(0, 120);
        helpTranscriptRef.current = transcript;
        setFormData(prev => ({ ...prev, helpPromptText: transcript }));
      };
      recognition.onerror = (event: any) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') setError('The spoken words could not be recognized. Please record again in a quieter place.');
      };
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        setIsHelpMediaUploading(true);
        try {
          if (!helpTranscriptRef.current.trim()) throw new Error('No words were recognized. Please record the phrase again.');
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const uploadData = new FormData();
          uploadData.append('audio', blob, 'help-prompt.webm');
          const response = await apiFetch('/api/upload-help-audio', { method: 'POST', body: uploadData });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.audioUrl) throw new Error(data.error || 'Failed to save recording');
          setFormData(prev => ({ ...prev, helpPromptAudioUrl: data.audioUrl }));
        } catch (recordingError) {
          setError(recordingError instanceof Error ? recordingError.message : 'Failed to save recording');
        } finally {
          helpRecorderStreamRef.current?.getTracks().forEach(track => track.stop());
          helpRecognitionRef.current = null;
          helpRecorderStreamRef.current = null;
          helpRecorderRef.current = null;
          setIsRecordingHelp(false);
          setIsHelpMediaUploading(false);
        }
      };
      helpRecorderStreamRef.current = stream;
      helpRecorderRef.current = recorder;
      helpRecognitionRef.current = recognition;
      recognition.start();
      recorder.start();
      setIsRecordingHelp(true);
    } catch (recordingError) {
      helpRecorderStreamRef.current?.getTracks().forEach(track => track.stop());
      setError(recordingError instanceof Error ? recordingError.message : 'Microphone access is needed to record the help words.');
    }
  };

  const stopHelpRecording = () => {
    helpRecognitionRef.current?.stop?.();
    window.setTimeout(() => {
      if (helpRecorderRef.current?.state === 'recording') helpRecorderRef.current.stop();
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = isEditing ? `/api/kids/${id}` : '/api/kids';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        name: formData.name,
        dob: formData.dob,
        grade_level: formData.gradeLevel,
        behavioral_issues: formData.behavioralIssues,
        therapies: formData.therapies,
        hobbies: formData.hobbies,
        interests: formData.interests,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        sensory_issues: formData.sensoryIssues,
        avatar: formData.avatar,
        start_time: formData.startTime,
        end_time: formData.endTime,
        max_incomplete_limit: formData.maxIncompleteLimit,
        reward_type: formData.rewardType,
        reward_icon: formData.rewardIcon,
        bonus_history_limit: parseInt(formData.bonusHistoryLimit),
        theme: formData.theme,
        theme_companion_style: formData.themeCompanionStyle,
        help_communication_method: formData.helpCommunicationMethod,
        help_prompt_text: formData.helpPromptText,
        help_prompt_audio_url: formData.helpPromptAudioUrl,
        help_sign_image_url: formData.helpSignImageUrl,
        help_card_image_url: formData.helpCardImageUrl,
        can_print: formData.canPrint,
        timezone: formData.timezone,
        kid_code: formData.kidCode,
      };

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Failed to save: ${text}`);
        }
        
        // If we have detailed error info from the server, show it
        if (data.message && data.code) {
          throw new Error(data.message || 'We could not save this child profile. Please review the form and try again.');
        }
        
        throw new Error(data.error || data.message || 'Failed to save');
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="xs" onClick={() => navigate('/dashboard')} className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase">
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to Dashboard
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
          {isEditing ? 'Edit Profile' : 'New Profile'}
        </h1>
      </div>

      <Card className="w-full border-blue-200 bg-blue-50/50 shadow-sm !overflow-visible">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 space-y-0 border-b border-blue-100 bg-white/50">
          <CardTitle className="text-base font-bold">{isEditing ? 'Edit Profile Details' : 'Profile Details'}</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="xs" onClick={() => navigate('/dashboard')} className="h-8 px-3 text-[12px] font-bold">Cancel</Button>
            <Button data-guest-tour="child-save" type="submit" form="child-profile-form" size="xs" className="h-8 px-3 text-[12px] font-bold" isLoading={isLoading} disabled={isAvatarUploading || isRewardIconUploading || isHelpMediaUploading || isRecordingHelp}>{isEditing ? 'Save Changes' : 'Create Profile'}</Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 !overflow-visible">
          <form id="child-profile-form" onSubmit={handleSubmit} className="space-y-2.5" data-guest-tour="child-profile-form">
            {error && (
              <div className="flex items-center gap-2 rounded bg-red-50 p-1.5 text-[12px] text-red-600">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Avatar</label>
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                  <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                        <HelpCircle className="h-4 w-4 text-bold text-yellow-700" />
                      </div>
                      <span className="font-bold text-[15px] leading-tight text-slate-900">
                        Choose a familiar photo, simple initials, an illustrated person, or a playful character. The learner can also keep the neutral initials option.
                      </span>
                    </div>
                    <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mb-1">
                Choose the style first, then select an option. Initials are the calm, age-neutral default.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-200 bg-blue-100 text-sm font-black text-blue-700" aria-label="Selected avatar preview">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Selected avatar" className="h-full w-full object-cover" />
                  ) : (
                    (formData.name.trim().match(/\b\p{L}/gu) || ['?']).slice(0, 2).join('').toUpperCase()
                  )}
                </div>
                <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
                  {([
                    ['initials', 'Initials'],
                    ['photo', 'Photo'],
                    ['illustrated', 'Illustrated'],
                    ['character', 'Characters'],
                  ] as [AvatarChoice, string][]).map(([choice, label]) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => {
                        setAvatarChoice(choice);
                        if (choice === 'initials') setFormData(prev => ({ ...prev, avatar: '' }));
                        if (choice === 'illustrated' && !illustratedAvatars.some(([, url]) => url === formData.avatar)) {
                          setFormData(prev => ({ ...prev, avatar: illustratedAvatars[0][1] }));
                        }
                        if (choice === 'character' && !characterAvatars.some(([, url]) => url === formData.avatar)) {
                          setFormData(prev => ({ ...prev, avatar: characterAvatars[0][1] }));
                        }
                      }}
                      aria-pressed={avatarChoice === choice}
                      className={`h-7 rounded px-2.5 text-[12px] font-bold transition-colors ${avatarChoice === choice ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {avatarChoice === 'initials' && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500"><UserRound className="h-3.5 w-3.5" /> Uses the learner's initials</span>
                )}
                {avatarChoice === 'photo' && formData.avatar && !presetAvatarUrls.has(formData.avatar) && (
                  <span className="text-[12px] font-medium text-emerald-700">Photo selected</span>
                )}
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  disabled={isAvatarUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleAvatarUpload(file);
                    }
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor="avatar-upload"
                  className={`${avatarChoice === 'photo' ? 'inline-flex' : 'hidden'} h-7 items-center gap-1 rounded border border-blue-200 bg-white px-2.5 text-[12px] font-bold text-blue-600 hover:bg-blue-50 ${isAvatarUploading ? 'cursor-wait opacity-60 pointer-events-none' : 'cursor-pointer'}`}
                >
                  <Camera className="h-3.5 w-3.5" /> {isAvatarUploading ? 'Uploading…' : formData.avatar && !presetAvatarUrls.has(formData.avatar) ? 'Change Photo' : 'Upload Photo'}
                </label>
              </div>
              {(avatarChoice === 'illustrated' || avatarChoice === 'character') && (
                <div className="flex flex-wrap gap-1.5 pt-0.5" role="group" aria-label={`${avatarChoice} avatar choices`}>
                  {(avatarChoice === 'illustrated' ? illustratedAvatars : characterAvatars).map(([label, avatarUrl]) => (
                    <button
                      key={avatarUrl}
                      type="button"
                      title={label}
                      aria-label={`Choose ${label} avatar`}
                      aria-pressed={formData.avatar === avatarUrl}
                      onClick={() => setFormData(prev => ({ ...prev, avatar: avatarUrl }))}
                      className={`h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border-2 bg-white transition-all hover:-translate-y-0.5 hover:shadow-sm ${formData.avatar === avatarUrl ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200'}`}
                    >
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Date of Birth</label>
                <Input
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Grade Level</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Grade Level: Enter the academic level that matches your child's current learning progress, which might be different from their chronological age.
                        </span>
                      </div>
                      <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                <Input
                  name="gradeLevel"
                  placeholder="e.g., Grade 3"
                  value={formData.gradeLevel}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Kid Code</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Kid Code: A secure code for your child to log in to their personal dashboard.
                        </span>
                      </div>
                      <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                <Input
                  name="kidCode"
                  placeholder="e.g., 123456"
                  value={formData.kidCode}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold uppercase text-slate-500">Timezone</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-brand-500" />
                    <div className="pointer-events-none absolute right-0 top-full z-[100] mt-2 w-80 rounded-2xl border-2 border-yellow-200 bg-[#fffdea] p-4 font-[Arial] text-[14px] font-bold leading-tight text-slate-900 opacity-0 shadow-2xl transition-all group-hover:opacity-100">Controls when activities appear, when sleep time begins, and which local date records use.</div>
                  </div>
                </div>
                <select name="timezone" value={formData.timezone} onChange={handleChange} className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600">
                  {Intl.supportedValuesOf('timeZone').map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Start Time</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Start Time: Define when your child's daily schedule and activity availability begins.
                        </span>
                      </div>
                      <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                <Input
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">End Time</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          End Time: Define when your child's daily schedule concludes and activities are deactivated.
                        </span>
                      </div>
                      <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                <Input
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Activities Shown at Once</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Controls only how many available choices are displayed at once. It does not make activities mandatory or determine the order. Choose Show all unless a smaller view helps reduce visual overload.
                        </span>
                      </div>
                      <div className="absolute left-3 sm:left-auto sm:right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    aria-label="Activities shown at once"
                    value={formData.maxIncompleteLimit === '' ? '' : ['3', '5'].includes(String(formData.maxIncompleteLimit)) ? String(formData.maxIncompleteLimit) : 'custom'}
                    onChange={(event) => setFormData(prev => ({ ...prev, maxIncompleteLimit: event.target.value === 'custom' ? '1' : event.target.value }))}
                    className="h-8 min-w-32 flex-1 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="">Show all</option>
                    <option value="3">Show 3</option>
                    <option value="5">Show 5</option>
                    <option value="custom">Custom</option>
                  </select>
                  {formData.maxIncompleteLimit !== '' && !['3', '5'].includes(String(formData.maxIncompleteLimit)) && (
                    <Input name="maxIncompleteLimit" aria-label="Custom number of activities shown at once" type="number" min="1" value={formData.maxIncompleteLimit} onChange={handleChange} className="h-8 w-20 text-sm" />
                  )}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase">Bonus History</label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-brand-500" />
                    <div className="pointer-events-none absolute right-0 top-full z-[100] mt-2 w-80 rounded-2xl border-2 border-yellow-200 bg-[#fffdea] p-4 font-[Arial] text-slate-800 opacity-0 shadow-2xl transition-all group-hover:opacity-100">
                      <span className="font-bold text-[15px] leading-tight">Choose how many recent positive recognitions appear on the learner dashboard, from 1 to 10.</span>
                    </div>
                  </div>
                </div>
                <Input
                  name="bonusHistoryLimit"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.bonusHistoryLimit}
                  onChange={handleChange}
                  required
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200/60 pt-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[12px] font-bold uppercase text-slate-500">How to ask for help</h3>
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 cursor-help text-brand-500" />
                  <div className="pointer-events-none absolute bottom-full left-0 z-[100] mb-2 w-80 rounded-2xl border-2 border-yellow-200 bg-[#fffdea] p-4 font-[Arial] text-[14px] font-bold leading-tight text-slate-900 opacity-0 shadow-2xl transition-all group-hover:opacity-100">Choose the familiar communication method the learner already uses with a nearby parent or caregiver.</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="How the learner asks for help">
                {[
                  ['spoken', '🗣️', 'Spoken words', `Say “${formData.helpPromptText || 'Help please'}”`],
                  ['sign', '🤟', 'Sign or gesture', 'Use the familiar help sign'],
                  ['card', '🆘', 'Help card', 'Show a help picture card'],
                ].map(([value, icon, label, note]) => (
                  <button key={value} type="button" role="radio" aria-checked={formData.helpCommunicationMethod === value} onClick={() => setFormData(prev => ({ ...prev, helpCommunicationMethod: value }))} className={`flex min-h-14 items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${formData.helpCommunicationMethod === value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <span className="text-2xl" aria-hidden="true">{icon}</span>
                    <span><span className="block text-[12px] font-black text-slate-800">{label}</span><span className="block text-[10px] font-medium text-slate-500">{note}</span></span>
                  </button>
                ))}
              </div>
              {formData.helpCommunicationMethod === 'spoken' && (
                <div className="flex flex-wrap items-end gap-2 rounded-md border border-blue-100 bg-blue-50/50 p-2">
                  <div className="min-w-56 flex-1 space-y-0.5">
                    <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Exact words the learner hears and reads</label>
                    <Input name="helpPromptText" value={formData.helpPromptText} readOnly required className="h-8 cursor-default bg-slate-50 text-sm" placeholder={isRecordingHelp ? 'Listening…' : 'Record words to create the transcript'} aria-label="Recorded help words transcript" />
                  </div>
                  <Button type="button" variant={isRecordingHelp ? 'danger' : 'outline'} size="xs" className="h-8" onClick={isRecordingHelp ? stopHelpRecording : startHelpRecording} disabled={isHelpMediaUploading}>
                    {isRecordingHelp ? <><Square className="mr-1 h-3.5 w-3.5" /> Stop & save</> : <><Mic className="mr-1 h-3.5 w-3.5" /> {formData.helpPromptAudioUrl ? 'Record again' : 'Record words'}</>}
                  </Button>
                  {formData.helpPromptAudioUrl && (
                    <div className="flex min-h-8 items-center gap-2 rounded-md border border-emerald-200 bg-white px-2">
                      <Button type="button" variant="ghost" size="xs" className="h-7 text-blue-700" onClick={() => void new Audio(formData.helpPromptAudioUrl).play()} aria-label={`Test recording: ${formData.helpPromptText}`}><Volume2 className="mr-1 h-4 w-4" /> Test recording</Button>
                    </div>
                  )}
                  {isHelpMediaUploading && <span className="text-[11px] font-bold text-blue-700">Saving…</span>}
                </div>
              )}
              {(formData.helpCommunicationMethod === 'sign' || formData.helpCommunicationMethod === 'card') && (() => {
                const isSign = formData.helpCommunicationMethod === 'sign';
                const field = isSign ? 'helpSignImageUrl' : 'helpCardImageUrl';
                const imageUrl = formData[field];
                const inputId = isSign ? 'help-sign-image' : 'help-card-image';
                return (
                  <div className="flex flex-wrap items-center gap-3 rounded-md border border-blue-100 bg-blue-50/50 p-2">
                    <div className="flex h-16 w-20 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
                      {imageUrl ? <img src={imageUrl} alt={isSign ? 'Selected help sign' : 'Selected help card'} className="h-full w-full object-contain" /> : <span className="text-3xl" aria-hidden="true">{isSign ? '🤟' : '🆘'}</span>}
                    </div>
                    <input id={inputId} type="file" accept="image/*" className="hidden" disabled={isHelpMediaUploading} onChange={async event => { const file = event.target.files?.[0]; if (file) await uploadHelpImage(file, field); event.target.value = ''; }} />
                    <label htmlFor={inputId} className={`inline-flex h-8 items-center gap-1 rounded border border-blue-200 bg-white px-2.5 text-[12px] font-bold text-blue-600 hover:bg-blue-50 ${isHelpMediaUploading ? 'pointer-events-none cursor-wait opacity-60' : 'cursor-pointer'}`}><ImagePlus className="h-3.5 w-3.5" /> {imageUrl ? 'Change image' : `Upload ${isSign ? 'sign image' : 'help card'}`}</label>
                    {imageUrl && <button type="button" onClick={() => setFormData(prev => ({ ...prev, [field]: '' }))} className="text-[11px] font-bold text-slate-500 hover:text-red-600">Remove</button>}
                    <p className="text-[10px] font-medium text-slate-500">Use the same familiar {isSign ? 'sign or gesture picture' : 'PECS/help card'} used at home.</p>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-2 border-t border-slate-200/60 pt-2" data-guest-tour="reward-type">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[12px] font-bold uppercase text-slate-500">Personalize the learner's experience</h3>
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 cursor-help text-brand-500" />
                  <div className="pointer-events-none absolute left-0 top-full z-[100] mt-2 w-80 rounded-2xl border-2 border-yellow-200 bg-[#fffdea] p-4 font-[Arial] text-[14px] font-bold leading-tight text-slate-900 opacity-0 shadow-2xl transition-all group-hover:opacity-100">
                    Choose what rewards are called, a favorite visual world, and whether a friendly helper appears. These choices change presentation, not activity rules.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
                <div className="space-y-1 rounded-md border border-slate-200 bg-white p-2">
                  <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Reward name</label>
                  <select
                    aria-label="Reward name"
                    value={rewardChoices.some(reward => reward.name === formData.rewardType) ? formData.rewardType : 'custom'}
                    onChange={(event) => setFormData(prev => ({ ...prev, rewardType: event.target.value === 'custom' ? '' : event.target.value, rewardIcon: event.target.value === 'custom' ? prev.rewardIcon : '' }))}
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-800"
                  >
                    {rewardChoices.map(reward => <option key={reward.name} value={reward.name}>{reward.icon} {reward.name}s</option>)}
                    <option value="custom">Custom name…</option>
                  </select>
                  {!rewardChoices.some(reward => reward.name === formData.rewardType) && (
                    <div className="space-y-1.5">
                      <Input name="rewardType" aria-label="Custom reward name" placeholder="e.g., Dinosaur" value={formData.rewardType} onChange={handleChange} required className="h-8 text-sm" />
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                          <img src={getRewardIcon(undefined, formData.rewardIcon)} alt="Custom reward icon preview" className="h-7 w-7 object-contain" />
                        </div>
                        <input id="reward-icon-upload" type="file" accept="image/*" className="hidden" disabled={isRewardIconUploading} onChange={async event => { const file = event.target.files?.[0]; if (file) await handleRewardIconUpload(file); event.target.value = ''; }} />
                        <label htmlFor="reward-icon-upload" className={`inline-flex h-8 items-center gap-1 rounded border border-blue-200 bg-white px-2.5 text-[12px] font-bold text-blue-600 hover:bg-blue-50 ${isRewardIconUploading ? 'pointer-events-none cursor-wait opacity-60' : 'cursor-pointer'}`}>
                          <Camera className="h-3.5 w-3.5" /> {isRewardIconUploading ? 'Uploading…' : formData.rewardIcon ? 'Change Icon' : 'Upload Icon'}
                        </label>
                        {formData.rewardIcon && <button type="button" onClick={() => setFormData(prev => ({ ...prev, rewardIcon: '' }))} className="text-[11px] font-bold text-slate-500 hover:text-red-600">Remove</button>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1 rounded-md border border-slate-200 bg-white p-2">
                  <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Favorite world</label>
                  <select name="theme" value={formData.theme} onChange={handleChange} className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-800">
                    {themeChoices.map(theme => <option key={theme.id} value={theme.id}>{theme.icon} {theme.name}</option>)}
                  </select>
                  <p className="text-[10px] font-medium leading-tight text-slate-500">Adds calm colors and matching decorations.</p>
                </div>

                <div className="space-y-1 rounded-md border border-slate-200 bg-white p-2">
                  <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Friendly helper</label>
                  <select name="themeCompanionStyle" value={formData.themeCompanionStyle} onChange={handleChange} className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-800">
                    <option value="character">Character and message</option>
                    <option value="simple">Simple theme icon</option>
                    <option value="none">Off</option>
                  </select>
                  <p className="text-[10px] font-medium leading-tight text-slate-500">Use a character, a quieter icon, or no helper.</p>
                </div>
              </div>

              {(() => {
                const selectedTheme = themeChoices.find(theme => theme.id === formData.theme) || themeChoices[0];
                const selectedReward = rewardChoices.find(reward => reward.name === formData.rewardType);
                return (
                  <div className={`flex min-h-9 items-center justify-between gap-3 rounded-md bg-gradient-to-r ${selectedTheme.color} px-3 py-1.5`} aria-label="Personalization preview">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[12px] font-bold text-slate-700">Preview: You earned 2 {formData.rewardType ? `${formData.rewardType}${formData.rewardType.toLowerCase().endsWith('s') ? '' : 's'}` : 'rewards'}! <img src={getRewardIcon(formData.rewardType, formData.rewardIcon)} alt="" className="h-5 w-5 object-contain" /></span>
                    <span className="shrink-0 text-[12px] font-bold text-slate-700">{selectedTheme.icon} {selectedTheme.name}{formData.themeCompanionStyle === 'none' ? ' · Helper off' : formData.themeCompanionStyle === 'simple' ? ' · Simple icon' : ' · Friendly character'}</span>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-200/60">
              <h3 className="text-[12px] font-bold text-slate-500 uppercase">Additional Details</h3>
              
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Therapies Needed</label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-auto sm:left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Therapies: Mention any formal therapies your child is receiving. This helps the AI recommend more relevant life-skills activities.
                        </span>
                      </div>
                      <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                    </div>
                  </div>
                  <textarea
                    name="therapies"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Speech therapy..."
                    value={formData.therapies}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Hobbies</label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute right-0 sm:left-auto sm:right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Hobbies: Share what your child likes to do for fun. We use this to make learning activities more engaging and relatable.
                        </span>
                      </div>
                      <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                    </div>
                  </div>
                  <textarea
                    name="hobbies"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Drawing..."
                    value={formData.hobbies}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Interests</label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-auto sm:left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Interests: What is your child passionate about? (e.g., Space, Animals) We use these themes for their educational content.
                        </span>
                      </div>
                      <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                    </div>
                  </div>
                  <textarea
                    name="interests"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Dinosaurs..."
                    value={formData.interests}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Strengths</label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute right-0 sm:left-auto sm:right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Strengths: What does your child do well? Highlighting strengths helps the system build confidence through positive reinforcement.
                        </span>
                      </div>
                      <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                    </div>
                  </div>
                  <textarea
                    name="strengths"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Good memory..."
                    value={formData.strengths}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Weaknesses</label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-auto sm:left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Weaknesses: Identify areas where your child needs extra support. This helps the AI focus on specific skill-building exercises.
                        </span>
                      </div>
                      <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                    </div>
                  </div>
                  <textarea
                    name="weaknesses"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Fine motor skills..."
                    value={formData.weaknesses}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Sensory Issues</label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute right-0 sm:left-auto sm:right-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Sensory Issues: Note any sensitivities (e.g., noise, light, textures) so we can suggest comfortable environments for learning.
                        </span>
                      </div>
                      <div className="absolute right-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                    </div>
                  </div>
                  <textarea
                    name="sensoryIssues"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Loud noises..."
                    value={formData.sensoryIssues}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase">Behavioral Issues</label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                    <div className="absolute left-0 sm:right-auto sm:left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-yellow-700" />
                        </div>
                        <span className="font-bold text-[15px] leading-tight text-slate-900">
                          Behavioral Issues: Describe any challenges. This allows the AI to generate targeted behavioral management strategies.
                        </span>
                      </div>
                      <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                    </div>
                    </div>
                  </div>
                  <textarea
                    name="behavioralIssues"
                    className="flex min-h-[32px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g., Transitions..."
                    value={formData.behavioralIssues}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[12px] font-bold text-slate-500 uppercase">Permissions</h3>
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 text-brand-500 cursor-help transition-colors hover:text-brand-600" />
                  <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-[#fffdea] text-slate-800 rounded-2xl shadow-2xl border-2 border-yellow-200 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-1 group-hover:translate-y-0 pointer-events-none z-[100] font-[Arial]">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-lg bg-yellow-200/50 flex items-center justify-center shrink-0 mt-0.5">
                        <HelpCircle className="h-4 w-4 text-yellow-700" />
                      </div>
                      <span className="font-bold text-[15px] leading-tight text-slate-900">
                        Enable this to allow your child to print activity steps and worksheets for offline tasks and hands-on learning.
                      </span>
                    </div>
                    <div className="absolute left-3 bottom-full border-[6px] border-transparent border-b-yellow-200"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="canPrint"
                  name="canPrint"
                  checked={formData.canPrint}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="canPrint" className="text-[12px] font-medium text-slate-700">
                  Allow child to print activity steps
                </label>
              </div>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
