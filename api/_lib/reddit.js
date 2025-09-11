const Snoowrap = require('snoowrap');

function createRedditClient() {
    const {
        USER_AGENT,
        CLIENT_ID,
        CLIENT_SECRET,
        REDDIT_USERNAME,
        REDDIT_PASSWORD,
    } = process.env;

    if (!USER_AGENT || !CLIENT_ID || !CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
        throw new Error('Missing Reddit API environment variables. Please set USER_AGENT, CLIENT_ID, CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD');
    }

    return new Snoowrap({
        userAgent: USER_AGENT,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        username: REDDIT_USERNAME,
        password: REDDIT_PASSWORD,
    });
}

async function searchSubreddit(keyword, subreddit = 'whatcarshouldibuy', maxResults = 4, sortBy = 'relevance') {
    const reddit = createRedditClient();
    const results = await reddit.search({ query: keyword, subreddit, limit: maxResults, sort: sortBy });
    return results.map((post) => ({
        id: post.id,
        title: post.title,
        url: post.url,
        selftext: post.selftext || '[No content]',
        subreddit: post.subreddit_name_prefixed,
        created: new Date(post.created_utc * 1000).toISOString(),
        score: post.score,
        author: post.author ? post.author.name : '[deleted]',
        num_comments: post.num_comments,
    }));
}

async function fetchPostComments(postId, maxComments = 15, maxDepth = 3) {
    const reddit = createRedditClient();
    const submission = await reddit.getSubmission(postId).fetch();

    // Expand replies to the desired depth
    await submission.expandReplies({ limit: maxComments, depth: maxDepth });
    const comments = Array.isArray(submission.comments)
        ? submission.comments
        : (submission.comments ? submission.comments.toArray() : []);

    const topLevel = comments.slice(0, maxComments);

    function toPlainComment(c, currentDepth = 1) {
        if (!c || c.body === '[deleted]' || c.body === '[removed]') return null;
        const base = {
            id: c.id,
            author: c.author ? c.author.name : '[deleted]',
            text: c.body,
            score: c.score,
            created: new Date(c.created_utc * 1000).toISOString(),
            permalink: `https://reddit.com${c.permalink}`,
            replies: [],
        };
        if (currentDepth >= maxDepth) return base;
        let replies = [];
        try {
            if (c.replies && typeof c.replies !== 'string') {
                const arr = Array.isArray(c.replies) ? c.replies : c.replies.toArray();
                replies = arr.map((r) => toPlainComment(r, currentDepth + 1)).filter(Boolean);
            }
        } catch (_) {
            // ignore reply parsing issues silently
        }
        base.replies = replies;
        return base;
    }

    return topLevel.map((c) => toPlainComment(c)).filter(Boolean);
}

function buildTextContent(keyword, subreddit, postsWithComments) {
    const parts = [];
    parts.push(`Keyword: ${keyword}`);
    parts.push(`Subreddit: ${subreddit}`);
    postsWithComments.forEach((post, idx) => {
        parts.push(`\nPOST ${idx + 1}: ${post.title}`);
        parts.push(`Author: ${post.author} | Score: ${post.score} | Comments: ${post.num_comments}`);
        if (post.selftext && post.selftext !== '[No content]') {
            parts.push(`Post content: ${post.selftext}`);
        }
        if (Array.isArray(post.comments)) {
            post.comments.slice(0, 10).forEach((comment, cIdx) => {
                parts.push(`\nComment ${cIdx + 1} by ${comment.author} (score ${comment.score}): ${comment.text}`);
                if (Array.isArray(comment.replies)) {
                    comment.replies.slice(0, 3).forEach((reply, rIdx) => {
                        parts.push(`Reply ${rIdx + 1} by ${reply.author} (score ${reply.score}): ${reply.text}`);
                    });
                }
            });
        }
    });
    return parts.join('\n');
}

module.exports = {
    searchSubreddit,
    fetchPostComments,
    buildTextContent,
};


