import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, CheckCircle, Loader2, X } from 'lucide-react';
import client from '../api/client';

export default function SmartScan() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      setPreviews(selectedFiles.map(f => URL.createObjectURL(f)));
      setResults([]);
    }
  };

  const handleScan = async () => {
    if (files.length === 0) return;
    setScanning(true);
    setResults([]);
    setScanProgress(0);

    const newResults = [];
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('file', files[i]);

      try {
        const res = await client.post('/smart-scan/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        newResults.push({ file: files[i].name, success: true, data: res.data });
      } catch (err) {
        console.error(err);
        newResults.push({ file: files[i].name, success: false, error: 'Failed' });
      }
      setScanProgress(i + 1);
    }
    
    setResults(newResults);
    setScanning(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 min-h-full flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-primary/10 -z-10" />
        
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">Universal Smart Scan</h1>
          <p className="text-gray-400">
            Snap a photo of any receipt, bill, or home document. Our AI will automatically categorize and extract the data.
          </p>
        </div>

        {previews.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-6 py-12">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group w-48 h-48 rounded-full bg-gradient-to-tr from-primary to-cyan-400 p-1 shadow-[0_0_40px_rgba(14,165,233,0.4)] hover:shadow-[0_0_60px_rgba(14,165,233,0.6)] transition-all duration-300"
            >
              <div className="w-full h-full bg-background rounded-full flex flex-col items-center justify-center group-hover:bg-background/80 transition-colors">
                <Camera className="w-16 h-16 text-primary mb-2 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-bold text-lg text-foreground">Tap to Scan</span>
              </div>
            </button>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <p className="text-sm text-gray-500">or upload files from your device</p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
              {previews.map((preview, idx) => (
                <div key={idx} className="relative rounded-2xl overflow-hidden border-2 border-primary/50 shadow-lg bg-black/20 aspect-[3/4]">
                  <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-contain" />
                  {scanning && scanProgress === idx && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      <div className="w-full h-1 bg-primary/20 absolute top-0 overflow-hidden">
                        <div className="h-full bg-cyan-400 w-1/2 animate-[scan_2s_ease-in-out_infinite]" />
                      </div>
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                      <p className="text-cyan-400 font-medium text-xs tracking-wide animate-pulse">Analyzing...</p>
                    </div>
                  )}
                  {scanning && scanProgress > idx && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                      <p className="text-green-400 font-medium text-xs tracking-wide">Done</p>
                    </div>
                  )}
                  {scanning && scanProgress < idx && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      <p className="text-gray-400 font-medium text-xs tracking-wide">Waiting...</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!scanning && results.length === 0 && (
              <div className="flex gap-4 w-full max-w-sm">
                <button
                  onClick={() => { setFiles([]); setPreviews([]); }}
                  className="flex-1 py-3 px-4 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
                >
                  Retake All
                </button>
                <button
                  onClick={handleScan}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(14,165,233,0.4)] flex justify-center items-center gap-2"
                >
                  <Upload className="w-5 h-5" /> Analyze {files.length} {files.length === 1 ? 'File' : 'Files'}
                </button>
              </div>
            )}

            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-card border border-border rounded-xl p-6"
              >
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-foreground text-center mb-6">Scan Complete!</h3>
                <div className="space-y-4">
                  {results.map((res, idx) => (
                    <div key={idx} className="bg-secondary/20 p-4 rounded-lg flex items-center justify-between border border-border/40">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground max-w-[200px] truncate" title={res.file}>{res.file}</span>
                        {res.success ? (
                          <span className="text-xs text-primary uppercase font-bold">{res.data.category}</span>
                        ) : (
                          <span className="text-xs text-red-400">Failed to process</span>
                        )}
                      </div>
                      {res.success ? <CheckCircle className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
                    </div>
                  ))}
                </div>
                <div className="text-gray-300 mt-6 mb-6 text-sm text-center font-medium">
                  Files have been categorized and added to your Vault automatically.
                </div>
                <button
                  onClick={() => { setFiles([]); setPreviews([]); setResults([]); }}
                  className="w-full py-3 px-6 rounded-lg bg-background border border-border hover:bg-card transition-colors font-medium text-foreground"
                >
                  Scan More Documents
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
