import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { pdfData, filename } = req.body;
    
    if (!pdfData || !filename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 to buffer
    const base64Data = pdfData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Supabase storage
    const { data, error: uploadError } = await supabase
      .storage
      .from('inspection-pdfs')
      .upload(`inspections/${filename}`, buffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('inspection-pdfs')
      .getPublicUrl(`inspections/${filename}`);

    return res.status(200).json({ 
      url: urlData.publicUrl,
      success: true
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { pdfData, filename } = req.body;
    
    if (!pdfData || !filename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 to buffer
    const base64Data = pdfData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Supabase storage
    const { data, error: uploadError } = await supabase
      .storage
      .from('inspection-pdfs')
      .upload(`inspections/${filename}`, buffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('inspection-pdfs')
      .getPublicUrl(`inspections/${filename}`);

    return res.status(200).json({ 
      url: urlData.publicUrl,
      message: 'PDF uploaded successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}*/
/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { pdfData, filename } = req.body;
    
    if (!pdfData || !filename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(pdfData.split(',')[1], 'base64');

    // Upload to Supabase storage
    const { data, error: uploadError } = await supabase
      .storage
      .from('inspection-pdfs')
      .upload(`inspections/${filename}`, buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('inspection-pdfs')
      .getPublicUrl(`inspections/${filename}`);

    return res.status(200).json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}*/
/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,  // Changed from SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // Changed from SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { pdfData, filename } = req.body;
    
    if (!pdfData || !filename) {
      return res.status(400).json({ error: 'Missing PDF data or filename' });
    }

    const buffer = Buffer.from(pdfData.split(',')[1], 'base64');
    const path = `inspections/${filename}`;

    const { data, error: uploadError } = await supabase
      .storage
      .from('inspection-pdfs')
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabase
      .storage
      .from('inspection-pdfs')
      .getPublicUrl(path);

    return res.status(200).json({ url: urlData.publicUrl });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}*/
/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file) {
      throw new Error('No file provided');
    }

    const buffer = await file.arrayBuffer();

    const { data, error } = await supabase
      .storage
      .from('inspection-pdfs')
      .upload(`inspections/${file.name}`, buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase
      .storage
      .from('inspection-pdfs')
      .getPublicUrl(`inspections/${file.name}`);

    return res.status(200).json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return res.status(500).json({ error: 'Error uploading PDF' });
  }
}*/
/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pdfData, filename, inspectionId } = req.body

  try {
    const buffer = Buffer.from(pdfData.split(',')[1], 'base64')
    
    const { data, error } = await supabase
      .storage
      .from('inspection-pdfs')
      .upload(`inspections/${filename}`, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (error) throw error

    const { data: urlData } = supabase
      .storage
      .from('inspection-pdfs')
      .getPublicUrl(`inspections/${filename}`)

    return res.status(200).json({ 
      url: urlData.publicUrl
    })
  } catch (error) {
    console.error('Error uploading PDF:', error)
    return res.status(500).json({ error: 'Error uploading PDF' })
  }
}
*/
