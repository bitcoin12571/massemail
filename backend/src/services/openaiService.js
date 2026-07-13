const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateArticles(topic, numArticles = 3, tone = 'professional') {
  try {
    console.log(`🤖 Generating ${numArticles} articles about "${topic}" in ${tone} tone...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Generate exactly ${numArticles} newsletter articles about "${topic}" in ${tone} tone.

Return as valid JSON array (no markdown, no extra text):
[
  { "title": "...", "content": "...", "imagePrompt": "..." },
  { "title": "...", "content": "...", "imagePrompt": "..." }
]

Requirements:
- Each article should be 2-3 sentences
- imagePrompt should be detailed and specific for DALL-E (include style, mood, composition)
- Valid JSON only, no markdown code blocks`
      }],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    console.log('📝 Raw response:', content.substring(0, 200));

    const articles = JSON.parse(content);
    console.log(`✅ Generated ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    throw new Error(`Failed to generate articles: ${error.message}`);
  }
}

async function generateImages(prompts) {
  try {
    console.log(`🎨 Generating ${prompts.length} images...`);
    const images = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      console.log(`   [${i+1}/${prompts.length}] Generating for: ${prompt.substring(0, 50)}...`);

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      });

      images.push(response.data[0].url);
      console.log(`   ✅ Image ${i+1} generated`);
    }

    console.log(`✅ All ${images.length} images generated`);
    return images;
  } catch (error) {
    console.error('❌ Image generation error:', error.message);
    throw new Error(`Failed to generate images: ${error.message}`);
  }
}

module.exports = {
  generateArticles,
  generateImages
};
