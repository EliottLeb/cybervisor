import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST() {
  try {
    // The worker is running on the 'worker' docker service on port 4000
    // If running outside docker, it will try localhost:4000
    const workerUrl = process.env.WORKER_URL || 'http://worker:4000/force-sync';
    
    // timeout if worker takes too long (e.g. 60s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(workerUrl, {
      method: 'POST',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 409) {
          return NextResponse.json({ success: false, error: 'already_syncing' }, { status: 409 });
      }
      throw new Error(`Worker responded with status ${res.status}`);
    }

    // Force Next.js to purge all pages cache
    revalidatePath('/', 'layout');
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error triggering sync:', error);
    
    // If it's a fetch failure (e.g., connection refused when running locally without docker)
    if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
         return NextResponse.json(
            { success: false, error: 'worker_unreachable', details: error.message },
            { status: 503 }
         );
    }
    
    return NextResponse.json({ success: false, error: error.message || 'unknown_error' }, { status: 500 });
  }
}
