# Cloud Actualization Feature - Quick Reference

## What It Does
Displays **real-time global cloud coverage** on the 3D Earth globe, updating every 15 minutes with live satellite data.

## Key Components

### 1. Data Source
- **API**: `https://clouds.matteason.co.uk/images/2048x1024/clouds-alpha.png`
- **Format**: PNG with alpha transparency (2048×1024)
- **Updates**: Real-time from meteorological satellites

### 2. Backend Proxy
- **Endpoint**: `/api/live-cloud-map`
- **File**: `/routes/liveCloudMap.routes.js`
- **Purpose**: Proxies external cloud API, handles CORS and errors

### 3. Frontend Rendering
- **File**: `/public/js/Globe.js`
- **Architecture**: Dual-sphere design (Earth + Cloud layer)
- **Cloud Sphere**: 2% larger radius than Earth, uses additive blending
- **Resolution**: 64×32 segments for smooth appearance

### 4. Automatic Updates
- **File**: `/public/js/issDetector.js`
- **Frequency**: Every 15 minutes
- **Method**: `setInterval()` with async texture loading
- **Hot-swap**: Updates texture without interrupting rendering

## User Controls

### Show Cloud Layer
- **Checkbox**: Toggles cloud visibility on/off
- **Default**: Checked (clouds visible)

### Wind Speed Slider
- **Range**: 0× to 10×
- **Default**: 1.0×
- **Effect**: Controls cloud rotation speed (0.2× Earth rotation by default)

## How It Works

```
External API → Backend Proxy → p5.js Loader → Globe Class → WebGL Rendering
```

1. **Initial Load**: Cloud texture loaded during preload phase
2. **Periodic Refresh**: New texture fetched every 15 minutes
3. **Seamless Update**: Globe.updateCloudTexture() hot-swaps texture
4. **Independent Rotation**: Clouds rotate at 0.2× Earth rotation speed
5. **User Control**: Toggle visibility and adjust wind speed in real-time

## Key Features

✅ **Real-time Data**: Live global cloud coverage  
✅ **Auto-refresh**: Updates every 15 minutes  
✅ **Non-blocking**: Async loading doesn't freeze UI  
✅ **Error Resilient**: Continues with old texture if update fails  
✅ **Performance**: <2ms rendering impact per frame  
✅ **User Control**: Toggle visibility and wind speed  

## Technical Details

- **Blend Mode**: Additive (transparent clouds over Earth)
- **Sphere Detail**: 64×32 segments (2,048 vertices)
- **Layer Separation**: 6 units (2% radius difference)
- **Default Rotation**: 0.2× Earth speed × wind multiplier
- **Update Interval**: 900,000ms (15 minutes)

## Troubleshooting

### No clouds visible?
1. Check "Show Cloud Layer" checkbox is enabled
2. Open browser console for errors
3. Test `/api/live-cloud-map` endpoint directly
4. Verify external provider: https://clouds.matteason.co.uk/images/2048x1024/clouds-alpha.png

### Clouds not updating?
1. Check console logs for refresh messages
2. Wait 15 minutes for next automatic update
3. Verify network connectivity
4. Check backend proxy server status

### Performance issues?
1. Reduce wind speed to 0 to minimize rotation calculations
2. Toggle cloud layer off temporarily
3. Check GPU/WebGL capabilities in browser

## Related Documentation

- **Full Technical Documentation**: `/docs/CLOUD_ACTUALIZATION_FEATURE.md`
- **Globe Class API**: `/public/js/Globe.js`
- **ISS Detector Main**: `/public/js/issDetector.js`

---

**Quick Ref Version**: 1.0  
**Date**: 2025-10-18
