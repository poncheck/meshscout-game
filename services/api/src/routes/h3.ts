import { Router } from 'express';
import { prisma } from '@meshscout/database';
import { cellToBoundary, latLngToCell } from 'h3-js';

export const h3Router = Router();

/**
 * GET /api/h3/grid
 * Get H3 grid with activity data
 */
h3Router.get('/grid', async (req, res) => {
  try {
    const { minActivity = '1' } = req.query;

    const grids = await prisma.h3Grid.findMany({
      where: {
        packetCount: {
          gte: parseInt(minActivity as string),
        },
      },
      orderBy: { packetCount: 'desc' },
      take: 1000, // Limit to prevent too much data
    });

    // Add boundaries for each H3 cell
    const gridWithBoundaries = grids.map(grid => ({
      ...grid,
      boundary: cellToBoundary(grid.id, true), // GeoJSON format
    }));

    res.json({ grids: gridWithBoundaries });
  } catch (error) {
    console.error('Error fetching H3 grid:', error);
    res.status(500).json({ error: 'Failed to fetch H3 grid' });
  }
});

/**
 * GET /api/h3/cell/:h3Index
 * Get data for specific H3 cell
 */
h3Router.get('/cell/:h3Index', async (req, res) => {
  try {
    const { h3Index } = req.params;

    const grid = await prisma.h3Grid.findUnique({
      where: { id: h3Index },
    });

    if (!grid) {
      return res.status(404).json({ error: 'H3 cell not found' });
    }

    // Get nodes in this cell
    const nodes = await prisma.node.findMany({
      where: { h3Index },
      select: {
        id: true,
        shortName: true,
        longName: true,
        latitude: true,
        longitude: true,
        lastSeen: true,
      },
    });

    res.json({
      grid,
      nodes,
      boundary: cellToBoundary(h3Index, true),
    });
  } catch (error) {
    console.error('Error fetching H3 cell:', error);
    res.status(500).json({ error: 'Failed to fetch H3 cell' });
  }
});

/**
 * POST /api/h3/lookup
 * Get H3 index for lat/lng
 */
h3Router.post('/lookup', async (req, res) => {
  try {
    const { latitude, longitude, resolution = 8 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const h3Index = latLngToCell(latitude, longitude, resolution);

    const grid = await prisma.h3Grid.findUnique({
      where: { id: h3Index },
    });

    res.json({
      h3Index,
      latitude,
      longitude,
      resolution,
      grid: grid || null,
      boundary: cellToBoundary(h3Index, true),
    });
  } catch (error) {
    console.error('Error looking up H3:', error);
    res.status(500).json({ error: 'Failed to lookup H3 index' });
  }
});
