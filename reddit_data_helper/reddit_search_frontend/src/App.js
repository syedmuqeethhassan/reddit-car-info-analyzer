// App.js - Main React component to display the summary
import React, { useState } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [sourceFile, setSourceFile] = useState('');
  const [fetchDate, setFetchDate] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!keyword.trim()) {
      alert('Please enter a search keyword');
      return;
    }
    
    try {
      // Set loading state and clear previous results
      setIsLoading(true);
      setError(null);
      setSummary(null);
      
      console.log(`Sending search request for keyword: ${keyword}`);
      
      // Make API call to Node.js backend which will:
      // 1. Search Reddit
      // 2. Save data to file
      // 3. Send file to Python
      // 4. Return summary to React
      const response = await axios.post('http://localhost:3001/api/search', { keyword });
      
      console.log('Received response from backend:', response.data);
      
      // Check if we received a valid summary response
      if (response.data && response.data.success) {
        // Update state with the summary data
        setSummary(response.data.summary);
        setSourceFile(response.data.sourceFile);
        setFetchDate(response.data.fetchDate);
        console.log('Summary displayed successfully');
      } else {
        setError('No valid summary data received from backend');
      }
    } catch (err) {
      console.error('Error processing search request:', err);
      setError('Failed to fetch summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Reddit Search Tool</h1>
      </header>
      <main>
        <div className="search-form">
          <form onSubmit={handleSearch}>
            <div className="form-group">
              <label htmlFor="keyword">Search Keyword:</label>
              <input
                type="text"
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., lexus ls430"
                required
              />
            </div>
            
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Search Reddit'}
            </button>
          </form>
        </div>
        
        {isLoading && <div className="loading">
          <p>Processing your request...</p>
          <p>Searching Reddit data and generating AI summary</p>
        </div>}
        
        {error && <div className="error">{error}</div>}
        
        {/* Display the summary from the API response */}
        {summary && !isLoading && (
          <div className="summary-container">
            <h2>AI-Generated Summary</h2>
            <div className="summary-meta">
              <p><strong>Search keyword:</strong> {keyword}</p>
              <p><strong>Source file:</strong> {sourceFile}</p>
              <p><strong>Generated at:</strong> {new Date(fetchDate).toLocaleString()}</p>
            </div>
            <div className="summary-content">
              {summary}
            </div>
            <div className="search-info">
              <p>
                This summary was generated by the Gemini AI model based on the Reddit data
                matching your search query. The complete data is stored in the output folder
                on your server.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;