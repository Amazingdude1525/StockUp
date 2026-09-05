import server from '../dist/server/index.js';

export async function GET(req: Request) {
  return server.fetch(req);
}

export async function POST(req: Request) {
  return server.fetch(req);
}

export async function PUT(req: Request) {
  return server.fetch(req);
}

export async function DELETE(req: Request) {
  return server.fetch(req);
}

export async function PATCH(req: Request) {
  return server.fetch(req);
}
