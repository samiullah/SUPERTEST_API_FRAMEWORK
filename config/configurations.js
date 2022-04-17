// configurations read from environments
export const appConfig = {
	
	systemEnv: {
		testURL: process.env.TESTURL,
		adminAccessToken: process.env.ADMINACCESSTOKEN,
		memberAccessToken: process.env.MEMBERACCESSTOKEN
	},
	
	apiURLs: {
		login: '/auth/login',
        sendFund: '/fund/send',
        getTransactions: '/transactions'
	}
};