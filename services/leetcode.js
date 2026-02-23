const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

// GraphQL query to get user profile stats
const USER_PROFILE_QUERY = `
	query getUserProfile($username: String!) {
		matchedUser(username: $username) {
			username
			profile {
				realName
				ranking
				userAvatar
			}
			submitStatsGlobal {
				acSubmissionNum {
					difficulty
					count
				}
			}
			userCalendar {
				streak
			}
		}
	}
`;

// GraphQL query to get recent submissions
const RECENT_SUBMISSIONS_QUERY = `
	query getRecentSubmissions($username: String!, $limit: Int!) {
		recentSubmissionList(username: $username, limit: $limit) {
			title
			titleSlug
			timestamp
			statusDisplay
			lang
		}
	}
`;

/**
 * Make a GraphQL request to LeetCode
 * @param {string} query - GraphQL query string
 * @param {object} variables - Query variables
 * @returns {object} GraphQL response data
 */
async function graphqlRequest(query, variables) {
	const response = await fetch(LEETCODE_GRAPHQL_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Referer': 'https://leetcode.com',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
		},
		body: JSON.stringify({ query, variables }),
	});

	if (!response.ok) {
		throw new Error(`LeetCode API error: ${response.status} ${response.statusText}`);
	}

	const json = await response.json();
	
	if (json.errors) {
		throw new Error(`GraphQL error: ${json.errors[0].message}`);
	}

	return json.data;
}

/**
 * Get user profile and stats from LeetCode
 * @param {string} username - LeetCode username
 * @returns {object|null} User profile data or null if not found
 */
export async function getUserProfile(username) {
	try {
		const data = await graphqlRequest(USER_PROFILE_QUERY, { username });
		
		if (!data.matchedUser) {
			return null;
		}

		const user = data.matchedUser;
		const submissions = user.submitStatsGlobal?.acSubmissionNum || [];
		
		// Parse submission counts by difficulty
		const stats = {
			easy: 0,
			medium: 0,
			hard: 0,
			total: 0,
		};

		for (const item of submissions) {
			switch (item.difficulty) {
				case 'Easy':
					stats.easy = item.count;
					break;
				case 'Medium':
					stats.medium = item.count;
					break;
				case 'Hard':
					stats.hard = item.count;
					break;
				case 'All':
					stats.total = item.count;
					break;
			}
		}

		return {
			username: user.username,
			realName: user.profile?.realName || null,
			ranking: user.profile?.ranking || null,
			avatar: user.profile?.userAvatar || null,
			currentStreak: user.userCalendar?.streak || 0,
			stats,
		};
	} catch (error) {
		console.error(`[LeetCode] Error fetching profile for ${username}:`, error.message);
		throw error;
	}
}

/**
 * Get recent submissions for a user
 * @param {string} username - LeetCode username
 * @param {number} limit - Number of submissions to fetch
 * @returns {array} Array of recent submissions
 */
export async function getRecentSubmissions(username, limit = 10) {
	try {
		const data = await graphqlRequest(RECENT_SUBMISSIONS_QUERY, { username, limit });
		return data.recentSubmissionList || [];
	} catch (error) {
		console.error(`[LeetCode] Error fetching submissions for ${username}:`, error.message);
		throw error;
	}
}

/**
 * Check if a LeetCode username exists
 * @param {string} username - LeetCode username to validate
 * @returns {boolean} True if user exists
 */
export async function validateUsername(username) {
	try {
		const profile = await getUserProfile(username);
		return profile !== null;
	} catch {
		return false;
	}
}

export default {
	getUserProfile,
	getRecentSubmissions,
	validateUsername,
};
