import React, { useState } from 'react';
import { GoogleGenAI, createUserContent, createPartFromBase64 } from '@google/genai';
import './SoilAnalyzerPage.css';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
if (typeof GEMINI_API_KEY !== 'string') {
  throw new Error(
    'Missing required environment variable: GEMINI_API_KEY'
  );
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const fewShotExamples = `Example 1:
Image: Light brown soil with fine texture near river.
Output: Soil Type: Alluvial | Nutrients: High in nitrogen, phosphorous, and organic matter.

Example 2:
Image: Dark, black, moist soil with fine cracks.
Output: Soil Type: Black (Regur) | Nutrients: Rich in iron, calcium, magnesium; moderate nitrogen deficiency.

Example 3:
Image: Reddish soil with dry texture, low clay content.
Output: Soil Type: Red | Nutrients: High iron, poor nitrogen and humus.

Example 4:
Image: Yellowish sandy soil, appears grainy with less humus.
Output: Soil Type: Sandy | Nutrients: Low nitrogen, low organic carbon, poor water retention.

Example 5:
Image: Gray clay soil, sticky wet texture.
Output: Soil Type: Clayey | Nutrients: Rich in iron, potassium, calcium; retains water effectively.`;

interface SoilAnalyzerPageProps {
  onBack: () => void;
}

export const SoilAnalyzerPage: React.FC<SoilAnalyzerPageProps> = ({ onBack }) => {
  const [result, setResult] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const analyzeSoil = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    setError('');
    
    try {
      // Convert file to base64 using FileReader (browser-compatible)
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 part from data URL
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const userPrompt = createUserContent([
        fewShotExamples,
        createPartFromBase64(base64Data, file.type),
        `Please analyze this soil image and provide a detailed report in the following format:

**Soil Type:** [Identify the specific soil type]

**Nutrients Analysis:**
• [List key nutrients present]
• [Identify any deficiencies]
• [Note nutrient levels - high/moderate/low]

**Fertilizer Recommendations:**
• [Specific fertilizer types to use]
• [Application timing and methods]
• [Dosage recommendations]

**Additional Notes:**
• [Any other important observations]
• [Growing tips for this soil type]

Please be specific and actionable in your recommendations.`
      ]);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [userPrompt],
      });

      setResult(response.text);
    } catch (err) {
      console.error('Error analyzing soil:', err);
      setError('Failed to analyze soil image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatAnalysisResult = (result: string) => {
    const lines = result.split('\n').filter(line => line.trim() !== '');
    
    return (
      <div className="analysis-sections">
        {lines.map((line, index) => {
          const trimmedLine = line.trim();
          
          if (trimmedLine.includes('**Soil Type:**') || 
              trimmedLine.includes('**Nutrients Analysis:**') || 
              trimmedLine.includes('**Fertilizer Recommendations:**') ||
              trimmedLine.includes('**Additional Notes:**') ||
              trimmedLine.includes('Soil Type:') || 
              trimmedLine.includes('Nutrients:') || 
              trimmedLine.includes('Recommendations:') ||
              trimmedLine.includes('Additional Notes:')) {
            const cleanTitle = trimmedLine.replace(/\*\*/g, '').replace(/:/g, '');
            return (
              <div key={index} className="analysis-section">
                <h5 className="section-title">{cleanTitle}</h5>
              </div>
            );
          }
          
          if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
            return (
              <div key={index} className="analysis-bullet">
                <span className="bullet-point">•</span>
                <span className="bullet-text">{trimmedLine.substring(1).trim()}</span>
              </div>
            );
          }
          
          if (/^\d+\./.test(trimmedLine)) {
            return (
              <div key={index} className="analysis-numbered">
                <span className="number-point">{trimmedLine.match(/^\d+\./)?.[0]}</span>
                <span className="number-text">{trimmedLine.replace(/^\d+\.\s*/, '').trim()}</span>
              </div>
            );
          }
          
          if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            return (
              <div key={index} className="analysis-bullet">
                <span className="bullet-point">•</span>
                <span className="bullet-text">{trimmedLine.substring(1, trimmedLine.length - 1).trim()}</span>
              </div>
            );
          }
          
          if (trimmedLine.length > 0) {
            return (
              <div key={index} className="analysis-paragraph">
                <p>{trimmedLine}</p>
              </div>
            );
          }
          
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="soil-analyzer-page">
      {/* 🌾 AgriConnect Header */}
      <header className="agriconnect-header">
        <div className="header-left">
          <h1 className="brand-title">🌾 AgriConnect</h1>
          <p className="brand-subtitle">Smart Crop Recommendations</p>
        </div>
        
        <div className="header-right">
          <button className="back-button" onClick={onBack}>
            ← Back to Map
          </button>
        </div>
      </header>

      <div className="soil-analyzer-container">
        <div className="soil-analyzer-header">
          <h1 className="page-title">🔬 AI-Powered Soil Analysis</h1>
          <p className="page-subtitle">Upload a soil image to get detailed nutrient analysis and fertilizer recommendations</p>
        </div>

        <div className="soil-analyzer-content">
          <div className="upload-section">
            <div className="upload-area">
              <div className="upload-icon">📸</div>
              <h3>Upload Soil Image</h3>
              <p>Take a clear photo of your soil sample</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="file-input"
                id="soil-image-upload"
              />
              <label htmlFor="soil-image-upload" className="upload-button">
                Choose Image
              </label>
              {file && (
                <div className="file-info">
                  <span className="file-name">📄 {file.name}</span>
                  <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
            </div>

            <button
              onClick={analyzeSoil}
              disabled={!file || isAnalyzing}
              className="analyze-button"
            >
              {isAnalyzing ? (
                <>
                  <div className="spinner"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  🔬 Analyze Soil
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {result && (
            <div className="results-section">
              <h3 className="results-title">Analysis Results</h3>
              <div className="formatted-result">
                {formatAnalysisResult(result)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};