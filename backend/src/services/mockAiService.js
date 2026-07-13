// Mock AI Service - For local development without API keys

const mockArticles = [
  {
    title: "🚀 The Future of Artificial Intelligence",
    content: "Artificial intelligence is rapidly transforming industries worldwide. From healthcare to finance, AI technologies are enabling businesses to make smarter decisions and improve customer experiences. The latest breakthroughs in machine learning are pushing the boundaries of what's possible.",
    imagePrompt: "Abstract futuristic AI technology visualization with neural networks and data streams, digital art style"
  },
  {
    title: "💡 How to Optimize Your Workflow",
    content: "Productivity experts recommend breaking your work into focused 90-minute sprints. By implementing proper time management techniques and eliminating distractions, you can increase your output by up to 40%. Don't forget to take regular breaks for better focus.",
    imagePrompt: "Modern productive workspace with computer setup, plants, and organized desk, professional photography"
  },
  {
    title: "🌟 Latest Tech Innovations",
    content: "The tech industry continues to evolve with new innovations emerging every week. Cloud computing, quantum computing, and blockchain technology are reshaping how businesses operate. Early adopters are already seeing significant competitive advantages.",
    imagePrompt: "Cutting-edge technology lab with scientists working on innovative equipment, modern research environment"
  },
  {
    title: "📊 Data-Driven Decision Making",
    content: "Companies that leverage data analytics gain competitive advantages in their markets. By analyzing customer behavior patterns and market trends, businesses can make informed decisions that lead to growth. Real-time data dashboards are becoming essential tools.",
    imagePrompt: "Business analytics dashboard with charts, graphs, and data visualization on multiple screens"
  },
  {
    title: "🎯 Marketing Trends 2024",
    content: "Digital marketing continues to evolve with personalization and automation at the forefront. Brands that invest in customer relationship management and AI-powered marketing tools see better engagement rates. Social media marketing remains crucial for brand awareness.",
    imagePrompt: "Modern marketing strategy board with colorful sticky notes, charts, and marketing funnels illustrated"
  }
];

const mockImages = [
  "https://images.unsplash.com/photo-1677442d019cecf8e5c8c04ce85a0c8d3ea59d99?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=500&fit=crop"
];

async function generateArticles(topic, numArticles = 3, tone = 'professional') {
  console.log(`🤖 [MOCK] Generating ${numArticles} articles about "${topic}" in ${tone} tone...`);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return random articles
  const articles = [];
  for (let i = 0; i < Math.min(numArticles, mockArticles.length); i++) {
    const article = mockArticles[Math.floor(Math.random() * mockArticles.length)];
    articles.push({
      ...article,
      title: `${article.title} (${topic} Edition)`
    });
  }

  console.log(`✅ Generated ${articles.length} mock articles`);
  return articles;
}

async function generateImages(prompts) {
  console.log(`🎨 [MOCK] Generating ${prompts.length} mock images...`);

  // Simulate image generation delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const images = prompts.map((_, i) => mockImages[i % mockImages.length]);

  console.log(`✅ Generated ${images.length} mock images`);
  return images;
}

module.exports = {
  generateArticles,
  generateImages
};
