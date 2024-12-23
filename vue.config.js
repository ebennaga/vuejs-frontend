module.exports = {
    devServer: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000', // Replace with your backend server URL
                changeOrigin: true,
                pathRewrite: { '^/api': '' }, // Optional: Remove `/api` from the request path
            },
        },
    },
};
