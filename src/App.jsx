import React, { useState, useRef } from 'react';
import { Camera, Loader2, AlertCircle, Sparkles, Download, Upload, X, Shirt, Code, Heart, Palette, Plus, Star, Image as ImageIcon, User } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('wardrobe');
  const [prompt, setPrompt] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [selectedPose, setSelectedPose] = useState('original');
  
  const [sourceImage, setSourceImage] = useState(null);
  const [sourceImageMimeType, setSourceImageMimeType] = useState('');
  const [sourceImagePreview, setSourceImagePreview] = useState(null);
  
  const [resultImage, setResultImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // OCASIONES 100% SEGURAS Y PROBADAS (Basadas en tus capturas exitosas)
  const occasions = [
    { id: 'slip', icon: <Heart size={16} />, label: 'Vestido Slip', desc: 'Vestido slip corto de seda, tirantes muy finos, elegante y ajustado al cuerpo, estilo revista Vogue' },
    { id: 'twopiece', icon: <Star size={16} />, label: 'Top y Falda', desc: 'Conjunto de alta costura: top corto elegante y falda de cintura alta ajustada, diseño minimalista' },
    { id: 'gala', icon: <Sparkles size={16} />, label: 'Gala Noche', desc: 'Vestido de noche elegante, tela con caída natural, alta costura, sofisticado' },
    { id: 'urban', icon: <Shirt size={16} />, label: 'Urbano Chic', desc: 'Ropa streetwear moderna, chaqueta ligera de diseñador, estilo revista de moda' }
  ];

  const poses = [
    { id: 'original', label: 'Mantener Original', desc: 'Mantener la pose original de la persona intacta.' },
    { id: 'hands_hips', label: 'Manos a la cintura', desc: 'Modifica la postura a: Pose editorial con las manos apoyadas en la cintura.' },
    { id: 'profile', label: 'Perfil elegante', desc: 'Modifica la postura a: Pose de perfil mirando hacia la cámara.' }
  ];

  const styleModifiers = [
    "seda brillante",
    "corte ajustado",
    "alta costura",
    "sin mangas",
    "diseño minimalista",
    "estilo editorial"
  ];

  const colorPalette = [
    { name: 'Negro', hex: '#18181b', label: 'color negro' },
    { name: 'Blanco', hex: '#f8fafc', label: 'color blanco' },
    { name: 'Carmesí', hex: '#9f1239', label: 'color rojo carmesí' },
    { name: 'Esmeralda', hex: '#064e3b', label: 'color verde oscuro' },
    { name: 'Nude', hex: '#e5e5e5', label: 'color nude beige' }
  ];

  const fetchWithRetry = async (url, options, maxRetries = 5) => {
    const delays = [1000, 2000, 4000, 8000, 16000];
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Por favor, sube un archivo de imagen válido (JPEG, PNG).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      setSourceImagePreview(dataUrl);
      const base64String = dataUrl.split(',')[1];
      setSourceImage(base64String);
      setSourceImageMimeType(file.type);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const clearSourceImage = () => {
    setSourceImage(null);
    setSourceImageMimeType('');
    setSourceImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError(null);
    setPrompt('');
    setSelectedOccasion('');
    setSelectedPose('original');
    setResultImage(null);
  };

  const handleOccasionSelect = (occ) => {
    setSelectedOccasion(occ.id);
    setPrompt(occ.desc);
  };

  const handleAddModifier = (modifier) => {
    setPrompt((prev) => {
      const current = prev || '';
      const separator = current.trim() && !current.trim().endsWith(',') ? ', ' : ' ';
      return current.trim() ? `${current}${separator}${modifier}` : modifier;
    });
    setSelectedOccasion('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentPrompt = prompt || '';
    
    if (!currentPrompt.trim()) {
      setError("Por favor, describe la ropa que deseas.");
      return;
    }

    if (mode === 'wardrobe' && !sourceImage) {
      setError("Sube una foto tuya para usar como base.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);

    const apiKey = "98395b25d7f54c95a6b59f484fdb91d3_b96d293ced3b41b6a02ab9905710d8ff_andoraitools"; 
    
    try {
      if (mode === 'generate') {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
        const payload = {
          instances: { prompt: currentPrompt.trim() },
          parameters: { sampleCount: 1 }
        };

        const data = await fetchWithRetry(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
          setResultImage(`data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`);
        } else {
          throw new Error("No se pudo obtener la imagen.");
        }

      } else if (mode === 'wardrobe') {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
        
        // Prompt simplificado y directo para evitar confusiones de la IA
        let poseInstruction = "";
        if (selectedPose === 'original') {
          poseInstruction = "Es obligatorio mantener la pose original intacta.";
        } else {
          const poseDesc = poses.find(p => p.id === selectedPose)?.desc;
          poseInstruction = poseDesc;
        }

        const safePrompt = `Cambia la vestimenta de la persona por: "${currentPrompt.trim()}". Estilo de alta costura editorial. ${poseInstruction} Es obligatorio mantener el rostro y el fondo intactos.`;

        const payload = {
          contents: [{
            parts: [
              { text: safePrompt },
              { inlineData: { mimeType: sourceImageMimeType, data: sourceImage } }
            ]
          }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        };

        const data = await fetchWithRetry(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const base64Part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (base64Part) {
          setResultImage(`data:${base64Part.inlineData.mimeType};base64,${base64Part.inlineData.data}`);
        } else {
          throw new Error("La IA bloqueó la imagen por filtros de seguridad. Intenta usar las opciones predefinidas como 'Vestido Slip' o 'Top y Falda' en colores oscuros.");
        }
      }
    } catch (err) {
      setError(err.message || "Hubo un error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-4 md:p-8 flex flex-col items-center">
      <div className="z-10 w-full flex flex-col items-center max-w-6xl">
        
        <header className="w-full text-center mb-8 mt-2">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-900 border border-zinc-800 rounded-full mb-4 text-rose-500">
            <Sparkles size={24} />
          </div>
          <h1 className="text-3xl md:text-5xl font-serif tracking-wide text-zinc-100 mb-2">
            Atelier Editorial
          </h1>
          <p className="text-sm text-zinc-400 font-light">
            Versión estable para moda de alta costura
          </p>
        </header>

        <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* PANEL IZQUIERDO */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            
            <div className="bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 flex gap-1">
              <button
                onClick={() => handleModeChange('wardrobe')}
                className={`flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-2 font-medium transition-all text-sm md:text-base ${
                  mode === 'wardrobe' ? 'bg-zinc-800 text-rose-400 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                <Shirt size={18} /> Vestidor
              </button>
              <button
                onClick={() => handleModeChange('generate')}
                className={`flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-2 font-medium transition-all text-sm md:text-base ${
                  mode === 'generate' ? 'bg-zinc-800 text-rose-400 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                <ImageIcon size={18} /> Arte Libre
              </button>
            </div>

            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-lg">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                
                {mode === 'wardrobe' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-widest uppercase">
                      Fotografía (Modelo)
                    </label>
                    {!sourceImagePreview ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-24 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-zinc-500 cursor-pointer hover:border-rose-400 hover:text-rose-300 bg-zinc-950/50"
                      >
                        <Upload size={20} className="mb-1" />
                        <p className="text-xs">Subir foto</p>
                      </div>
                    ) : (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-zinc-700 flex items-center justify-center bg-black">
                        <img src={sourceImagePreview} alt="Preview" className="h-full w-auto object-contain" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <button type="button" onClick={clearSourceImage} className="bg-rose-600 text-white p-2.5 rounded-full hover:bg-rose-500 transition-transform active:scale-95">
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  </div>
                )}

                {/* DIRECCIÓN DE MODELO (POSES) */}
                {mode === 'wardrobe' && (
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-widest uppercase flex items-center gap-1.5">
                      <User size={14} className="text-rose-500" /> Pose de la modelo
                    </label>
                    <select
                      value={selectedPose}
                      onChange={(e) => setSelectedPose(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg p-2.5 outline-none focus:border-rose-500 cursor-pointer"
                    >
                      {poses.map((pose) => (
                        <option key={pose.id} value={pose.id}>
                          {pose.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* DISEÑOS (BOTONES) */}
                {mode === 'wardrobe' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-widest uppercase">
                      Estilos (100% Seguros)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {occasions.map((occ) => (
                        <button
                          key={occ.id}
                          type="button"
                          onClick={() => handleOccasionSelect(occ)}
                          className={`flex items-center justify-start gap-2 p-2.5 rounded-lg border transition-all ${
                            selectedOccasion === occ.id 
                              ? 'bg-rose-900/30 border-rose-500/50 text-rose-300' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="text-rose-500/80">{occ.icon}</div>
                          <span className="text-[11px] font-medium uppercase text-center">{occ.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-widest uppercase">
                    {mode === 'wardrobe' ? 'Detalles de la Prenda' : 'Prompt Artístico'}
                  </label>
                  <textarea
                    rows={mode === 'wardrobe' ? 3 : 5}
                    className="w-full p-3 bg-zinc-950 border border-zinc-700 rounded-xl focus:ring-1 focus:border-rose-500 text-zinc-200 text-sm outline-none resize-none"
                    placeholder="Describe la prenda..."
                    value={prompt || ''}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      if (mode === 'wardrobe') setSelectedOccasion(''); 
                    }}
                    disabled={isLoading}
                  />

                  {mode === 'wardrobe' && (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {colorPalette.map((color, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddModifier(color.label)}
                            title={color.name}
                            className="w-6 h-6 rounded-full border border-zinc-500 shadow-sm active:scale-90 transition-transform"
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {styleModifiers.map((mod, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddModifier(mod)}
                            className="text-[10px] py-1 px-2.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-rose-300 transition-colors"
                          >
                            + {mod}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !(prompt || '').trim() || (mode === 'wardrobe' && !sourceImage)}
                  className="w-full py-3.5 px-6 mt-1 bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Generando magia...</span>
                    </>
                  ) : (
                    <>
                      {mode === 'generate' ? <Camera size={18} /> : <Shirt size={18} />}
                      <span>{mode === 'generate' ? 'Generar Retrato' : 'Probar Prenda'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Firma */}
            <div className="flex items-center justify-center gap-2 py-2">
               <Code size={14} className="text-rose-500/50" />
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                 Desarrollado por Guedson Romario Quispe
               </p>
            </div>
          </div>

          {/* PANEL DERECHO (RESULTADOS) */}
          <div className="lg:col-span-7 flex flex-col h-[500px] lg:h-auto">
            <div className="bg-zinc-900 p-2 rounded-2xl border border-zinc-800 h-full flex flex-col relative overflow-hidden shadow-lg">
              
              {error && (
                <div className="absolute top-4 left-4 right-4 z-20 p-3 bg-red-950 border border-red-900 text-red-200 rounded-xl flex items-start gap-2 shadow-lg">
                  <AlertCircle className="shrink-0 mt-0.5 text-red-400" size={18} />
                  <p className="text-xs font-medium">{error}</p>
                  <button onClick={() => setError(null)} className="ml-auto text-red-400 p-1">
                    <X size={16} />
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 z-10 bg-zinc-950/90 flex flex-col items-center justify-center text-rose-400">
                  <Loader2 className="animate-spin mb-4" size={40} />
                  <p className="font-serif italic text-lg text-zinc-200">
                    Procesando diseño...
                  </p>
                </div>
              )}

              {resultImage ? (
                <div className="relative w-full h-full flex flex-col rounded-xl overflow-hidden bg-black">
                  <div className="flex-1 w-full flex items-center justify-center relative">
                    <img 
                      src={resultImage} 
                      alt="Resultado IA" 
                      className="w-full h-full object-contain pointer-events-auto" 
                    />
                    {/* Indicador sutil arriba para guardar en móviles (Sin scripts que rompan) */}
                    <div className="absolute top-4 bg-black/40 text-white text-[10px] px-3 py-1 rounded-full border border-white/10 backdrop-blur-md pointer-events-none">
                      Mantén presionada la imagen para guardar
                    </div>
                  </div>
                  
                  {/* Botón de Descarga Simple HTML Seguro */}
                  <div className="absolute bottom-4 right-4">
                    <a
                      href={resultImage}
                      download={`Atelier-Guedson-${Date.now()}.png`}
                      className="bg-rose-600 text-white p-3.5 rounded-full shadow-xl hover:bg-rose-500 border border-rose-500 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Download size={22} />
                    </a>
                  </div>
                </div>
              ) : (
                !isLoading && (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-6 text-center bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800 m-1">
                    <Heart size={32} className="text-zinc-700 mb-3" />
                    <p className="text-lg font-serif text-zinc-300 mb-2">
                      Estudio Listo
                    </p>
                    <p className="text-xs max-w-sm">
                      Sube tu foto y elige <strong>"Vestido Slip"</strong> o <strong>"Top y Falda"</strong>. Tienes las poses seguras integradas.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}