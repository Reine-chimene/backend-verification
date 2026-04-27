const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialiser le client Supabase (nouvelle API)
const supabase = createClient({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  options: {
    global: {
      headers: { 'apikey': process.env.SUPABASE_ANON_KEY }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
});

// Vérifier la connexion
async function checkConnection() {
  console.log('🔍 Vérification de la connexion à la base de données...');
  
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('count')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('⚠️ Table "submissions" non trouvée. Création automatique...');
      await createTables();
    } else if (error) {
      console.log('❌ Erreur:', error.message);
      process.exit(1);
    } else {
      console.log('✅ Connexion établie avec succès !');
      console.log(`📊 Statut actuel : ${data.length > 0 ? 'Données existantes' : 'Aucune donnée'}`);
    }
  } catch (err) {
    console.log('❌ Erreur de connexion:', err.message);
    process.exit(1);
  }
}

// Créer les tables si elles n'existent pas
async function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS submissions (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()), recharge_type VARCHAR(50) NOT NULL, recharge_code TEXT NOT NULL, currency VARCHAR(10) NOT NULL, email VARCHAR(255) NOT NULL, status VARCHAR(20) DEFAULT 'pending', approval_token VARCHAR(255), reject_token VARCHAR(255), verified_at TIMESTAMP WITH TIME ZONE, ip_address INET, user_agent TEXT, metadata JSONB);`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_approval_token ON submissions(approval_token);`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_reject_token ON submissions(reject_token);`,
    `ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;`,
    `CREATE POLICY IF NOT EXISTS "Public insert only" ON submissions FOR INSERT WITH CHECK (true);`,
    `CREATE POLICY IF NOT EXISTS "Service role full access" ON submissions FOR ALL USING (auth.jwt() ? true : false);`
  ];

  try {
    console.log('📝 Création des tables...');
    
    for (const query of queries) {
      const { error } = await supabase.query(query);
      if (error && !error.message.includes('already exists')) {
        throw error;
      }
    }
    
    console.log('✅ Tables créées avec succès !');
    await checkConnection();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

// Lancer la vérification
checkConnection();