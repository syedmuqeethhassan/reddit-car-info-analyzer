const { searchSubreddit, fetchPostComments, buildTextContent } = require('./_lib/reddit');

module.exports = async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            return res.status(405).json({ success: false, error: 'Method Not Allowed' });
        }

        const body = req.body || {};
        const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
        const subreddit = body.subreddit || 'whatcarshouldibuy';
        const limit = Math.min(parseInt(body.limit || 4, 10), 4);
        const sort = body.sort || 'relevance';

        if (!keyword) {
            return res.status(400).json({ success: false, error: 'Keyword is required' });
        }

        // 1) Search posts
        const posts = await searchSubreddit(keyword, subreddit, limit, sort);

        if (!posts || posts.length === 0) {
            return res.status(200).json({
                success: true,
                keyword,
                summary: 'No relevant posts found for the provided query.',
                sourceFile: null,
                fetchDate: new Date().toISOString(),
            });
        }

        // 2) Fetch comments for each post (in parallel but with small size)
        const postsWithComments = await Promise.all(
            posts.map(async (post) => {
                const comments = await fetchPostComments(post.id, 12, 3);
                return { ...post, comments };
            })
        );

        // 3) Build text content to summarize
        const textContent = buildTextContent(keyword, subreddit, postsWithComments);

        // 4) Call Python summarize function in the same Vercel project
        const scheme = (req.headers['x-forwarded-proto'] || 'https');
        const host = req.headers.host;
        const baseUrl = `${scheme}://${host}`;

        const response = await fetch(`${baseUrl}/api/summarize`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ text_content: textContent }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data || data.success !== true) {
            return res.status(500).json({ success: false, error: data && data.error ? data.error : 'Failed to generate summary' });
        }

        return res.status(200).json({
            success: true,
            keyword,
            summary: data.summary,
            sourceFile: null,
            fetchDate: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
};


