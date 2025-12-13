import React, { useState, useEffect } from 'react';
import './NewsPage.css';

interface NewsPageProps {
  onBack?: () => void;
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

export const NewsPage: React.FC<NewsPageProps> = ({ onBack }) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const rssUrl = "https://news.google.com/rss/search?q=agriculture+news&hl=en-US&gl=US&ceid=US:en";
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
      
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.items || data.items.length === 0) {
        setError('No agriculture news found.');
        return;
      }

      const items: NewsItem[] = data.items.slice(0, 8).map((item: any) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        description: item.description.replace(/<[^>]+>/g, '').slice(0, 150) + '...'
      }));

      setNewsItems(items);
    } catch (err) {
      console.error('Error loading news:', err);
      setError('Failed to load news. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="news-page">
      <div className="news-container">
        <div className="news-header">
          <h1 className="page-title">
            <span className="material-symbols-outlined">newspaper</span>
            Trending News
          </h1>
          <p className="page-subtitle">Real-time agricultural updates from trusted sources</p>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading latest agriculture news...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <button onClick={loadNews} className="retry-button">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <div className="news-list">
            {newsItems.map((item, index) => (
              <article key={index} className="news-item">
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="news-link"
                >
                  {item.title}
                </a>
                <p className="news-date">
                  {new Date(item.pubDate).toLocaleString()}
                </p>
                <p className="news-description">{item.description}</p>
              </article>
            ))}
          </div>
        )}

        <footer className="news-footer">
          <p>© 2025 CropYield Pro • Powered by Google News RSS</p>
        </footer>
      </div>
    </div>
  );
};

