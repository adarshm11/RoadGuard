import { useState } from 'react'
import './App.css'

interface PredictionResult {
  prediction: string
  confidence: number
  probabilities: {
    normal: number
    pothole: number
  }
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setPrediction(null)
      setError(null)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setPrediction(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Prediction failed')
      }

      const result: PredictionResult = await response.json()
      setPrediction(result)
    } catch (err) {
      setError('Failed to get prediction. Make sure the backend server is running.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4caf50'
    if (confidence >= 0.6) return '#ff9800'
    return '#f44336'
  }

  return (
    <div className="container">
      <header>
        <h1>🛣️ RoadGuard</h1>
        <p>AI-Powered Pothole Detection System</p>
      </header>

      <div className="main-content">
        <div className="upload-section">
          <form onSubmit={handleSubmit}>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="file-upload"
                accept="image/*"
                onChange={handleFileChange}
                disabled={loading}
              />
              <label htmlFor="file-upload" className="file-label">
                {selectedFile ? selectedFile.name : 'Choose an image'}
              </label>
            </div>

            {previewUrl && (
              <div className="preview-container">
                <img src={previewUrl} alt="Preview" className="preview-image" />
              </div>
            )}

            <div className="button-group">
              <button
                type="submit"
                disabled={!selectedFile || loading}
                className="predict-button"
              >
                {loading ? 'Analyzing...' : 'Detect Pothole'}
              </button>
              
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="reset-button"
                >
                  Reset
                </button>
              )}
            </div>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="results-section">
          {prediction ? (
            <div className="results-container">
              <h2>Analysis Results</h2>
              
              <div className="prediction-card">
                <div className="prediction-label">
                  <strong>Prediction:</strong>
                </div>
                <div className={`prediction-value ${prediction.prediction}`}>
                  {prediction.prediction === 'pothole' ? '⚠️ Pothole Detected' : '✅ Road Normal'}
                </div>

                <div className="confidence-section">
                  <div className="confidence-label">
                    <strong>Confidence:</strong>
                    <span>{(prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="confidence-bar-container">
                    <div
                      className="confidence-bar"
                      style={{
                        width: `${prediction.confidence * 100}%`,
                        backgroundColor: getConfidenceColor(prediction.confidence),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="placeholder-container">
              <div className="placeholder-content">
                <div className="placeholder-icon">📊</div>
                <h3>Results will appear here</h3>
                <p>Upload an image and click "Detect Pothole" to see the analysis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
