export const runtime = 'edge';
export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: Request) {
  try {
    const apiKey = process.env.NEWSDATA_API_KEY;
    
    if (!apiKey) {
      console.warn('NEWSDATA_API_KEY is not set in environment variables.');
      return Response.json(
        { error: 'API key not configured.', articles: [] },
        { status: 200 } // Return 200 with empty array to prevent crashing the frontend gracefully
      );
    }

    const { searchParams } = new URL(request.url);
    // NewsData.io allows query string. We will search for Indian law topics
    const query = searchParams.get('q') || 'law OR court OR legal';
    
    // Fetch from NewsData.io using the latest endpoint
    // country=in restricts to India, language=en restricts to English
    // We add specific law-related query terms to ensure relevance.
    const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent('supreme court OR high court OR indian law OR corporate law OR litigation')}&country=in&language=en`;

    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Cache response at the Edge/Server for 1 hour
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('NewsData Error:', res.status, errorData);
      return Response.json(
        { error: 'Failed to fetch news', articles: [] },
        { status: 200 } // Return 200 to prevent client crash
      );
    }

    const data = await res.json();
    
    // Map NewsData.io response to the expected internal Article format
    const validArticles = (data.results || []).filter(
      (article: any) => 
        article.title && 
        article.link
    ).map((article: any) => ({
      title: article.title,
      description: article.description || '',
      imageUrl: article.image_url || '',
      sourceName: article.source_id || 'Legal News',
      publishedAt: article.pubDate,
      articleUrl: article.link,
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
