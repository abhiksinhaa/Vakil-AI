export const runtime = 'edge';
export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: Request) {
  try {
    const apiKey = process.env.THE_NEWS_API_KEY;
    
    if (!apiKey) {
      console.warn('THE_NEWS_API_KEY is not set in environment variables.');
      return Response.json(
        { error: 'API key not configured.', articles: [] },
        { status: 200 } // Return 200 with empty array to prevent crashing the frontend gracefully
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'Supreme Court OR High Court OR Indian Law OR Corporate Law OR Litigation OR Legal Tech';
    
    // Fetch from NewsAPI using the `everything` endpoint for comprehensive results.
    // domains restrict to reputable Indian sources.
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&domains=livelaw.in,barandbench.com,thehindu.com,indiatimes.com,timesofindia.indiatimes.com,indianexpress.com&language=en&sortBy=publishedAt&apiKey=${apiKey}`;

    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Cache response at the Edge/Server for 1 hour
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('NewsAPI Error:', res.status, errorData);
      return Response.json(
        { error: 'Failed to fetch news', articles: [] },
        { status: 200 } // Return 200 to prevent client crash
      );
    }

    const data = await res.json();
    
    // Filter out articles with "[Removed]" title/content which NewsAPI sometimes returns
    const validArticles = (data.articles || []).filter(
      (article: any) => 
        article.title && 
        article.title !== '[Removed]' && 
        article.url
    ).map((article: any) => ({
      title: article.title,
      description: article.description || '',
      imageUrl: article.urlToImage || '',
      sourceName: article.source?.name || 'Legal News',
      publishedAt: article.publishedAt,
      articleUrl: article.url,
      content: article.content || '',
    }));

    return Response.json({ articles: validArticles });
  } catch (error) {
    console.error('Legal Insights Route Error:', error);
    return Response.json(
      { error: 'Internal server error', articles: [] },
      { status: 200 }
    );
  }
}
