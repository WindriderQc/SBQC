#include "Atmosphere.h"
#include <math.h>

// suppression de warning a la compilation
#pragma warning(disable: 4305) // troncation double -> float 
 
CLAtmosphere::CLAtmosphere(void)
{
	pTVAtmos = new CTVAtmosphere();
	pTVPhysics = new CTVPhysics();
	pTVScene = new CTVScene();
	pTVTexFactory = new CTVTextureFactory();
	pTVLights = new CTVLightEngine();	

	clClock = CLClock::getInstance();

/*
	pScene->LoadTexture("Media\\Winter\\up.jpg", -1, -1, "SkyTop");
    pScene->LoadTexture("Media\\Winter\\down.jpg", -1, -1, "SkyBottom");
    pScene->LoadTexture("Media\\Winter\\left.jpg", -1, -1, "SkyLeft");
    pScene->LoadTexture("Media\\Winter\\right.jpg", -1, -1, "SkyRight");
    pScene->LoadTexture("Media\\Winter\\front.jpg", -1, -1, "SkyFront");
    pScene->LoadTexture("Media\\Winter\\back.jpg", -1, -1, "SkyBack");
    //*/

	texDayUp = pTVTexFactory->LoadTexture("media\\sky\\LostValley\\lostvalley_up.bmp","DaySkyTop", -1, -1, cTV_COLORKEY_NO, true);
    texDayDown = pTVTexFactory->LoadTexture("media\\sky\\LostValley\\lostvalley_down.bmp", "DaySkyBottom", -1, -1, cTV_COLORKEY_NO, true);
    texDayLeft = pTVTexFactory->LoadTexture("media\\sky\\LostValley\\lostvalley_north.bmp", "DaySkyLeft", -1, -1, cTV_COLORKEY_NO, true);
    texDayRight = pTVTexFactory->LoadTexture("media\\sky\\LostValley\\lostvalley_south.bmp", "DaySkyRight", -1, -1, cTV_COLORKEY_NO, true);
    texDayFront = pTVTexFactory->LoadTexture("media\\sky\\LostValley\\lostvalley_west.bmp","DaySkyFront", -1, -1, cTV_COLORKEY_NO, true);
    texDayBack = pTVTexFactory->LoadTexture("media\\sky\\LostValley\\lostvalley_east.bmp", "DaySkyBack", -1, -1, cTV_COLORKEY_NO, true);

/*
	texDayUp = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\up.jpg","DaySkyTop", -1, -1, cTV_COLORKEY_NO, true);
    texDayDown = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\down.jpg", "DaySkyBottom", -1, -1, cTV_COLORKEY_NO, true);
    texDayLeft = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\left.jpg", "DaySkyLeft", -1, -1, cTV_COLORKEY_NO, true);
    texDayRight = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\right.jpg", "DaySkyRight", -1, -1, cTV_COLORKEY_NO, true);
    texDayFront = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\front.jpg","DaySkyFront", -1, -1, cTV_COLORKEY_NO, true);
    texDayBack = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\back.jpg", "DaySkyBack", -1, -1, cTV_COLORKEY_NO, true);
  */  
	texNightUp = pTVTexFactory->LoadTexture("media\\sky\\clearnight\\up.jpg", "NightSkyTop", -1, -1, cTV_COLORKEY_NO, true);
    texNightDown = pTVTexFactory->LoadTexture("media\\sky\\clearnight\\down.jpg", "NightSkyBottom", -1, -1, cTV_COLORKEY_NO, true);
    texNightLeft = pTVTexFactory->LoadTexture("media\\sky\\clearnight\\left.jpg", "NightSkyLeft", -1, -1, cTV_COLORKEY_NO, true);
    texNightRight = pTVTexFactory->LoadTexture("media\\sky\\clearnight\\right.jpg", "NightSkyRight", -1, -1, cTV_COLORKEY_NO, true);
    texNightFront = pTVTexFactory->LoadTexture("media\\sky\\clearnight\\front.jpg", "NightSkyFront", -1, -1, cTV_COLORKEY_NO, true);
    texNightBack = pTVTexFactory->LoadTexture("media\\sky\\clearnight\\back.jpg", "NightSkyBack", -1, -1, cTV_COLORKEY_NO, true);

	texSun = pTVTexFactory->LoadTexture("media\\sky\\sun.jpg", "Sun", -1, -1, cTV_COLORKEY_NO, true);

	pTVAtmos->Sun_SetTexture(texSun);
    pTVAtmos->Sun_SetBillboardSize(2);
    pTVAtmos->Sun_Enable(true);


	cTV_LIGHT SunLight;
	SunLight.type = cTV_LIGHT_DIRECTIONAL;
    SunLight.direction = Vector3(1.0, -1.0, 0);
    SunLight.ambient = TVColor(0.0, 0.0, 0.0, 1);
    SunLight.diffuse = TVColor(1.0, 1.0, 1.0, 1);
    SunLight.specular = TVColor(1.0, 1.0, 1.0, 1);
	SunLight.attenuation.x = 0;
    SunLight.attenuation.y = 0;
    SunLight.attenuation.z = 0;
    iIndiceSunlight = pTVLights->CreateLight(&SunLight, "sun");

    iSunOrbitYOffset = 200;

	cTV_LIGHT MoonLight;
    MoonLight.type = cTV_LIGHT_DIRECTIONAL;
    MoonLight.direction = Vector3(1.0, -1.0, 0);
    MoonLight.ambient = TVColor(0.2, 0.2, 0.2, 1);
    MoonLight.diffuse = TVColor(0.2, 0.2, 0.2, 1);
    MoonLight.specular = TVColor(0.2, 0.2, 0.2, 1);
    MoonLight.attenuation.x = 0;
    MoonLight.attenuation.y = 0;
    MoonLight.attenuation.z = 0;
    iIndiceMoonlight = pTVLights->CreateLight(&MoonLight, "moon");





}

CLAtmosphere::~CLAtmosphere(void)
{
	delete(pTVAtmos);  pTVAtmos = NULL;
	delete(pTVTexFactory);  pTVTexFactory = NULL;
	delete(pTVLights);  pTVLights = NULL;
	delete(pTVScene); pTVScene = NULL;
}

int CLAtmosphere::GetSunOrbitYOffset(void)
{
return(iSunOrbitYOffset);
}

void CLAtmosphere::SetSunOrbitYOffset(int Offset)
{
iSunOrbitYOffset = Offset;
}


void CLAtmosphere::UpdateAndRender(float TimeElapsed)
{	
		clClock->update(TimeElapsed);
		lTimeOfDay = clClock->getTimeOfDay();

        pTVAtmos->SkyBox_Enable(true);
        pTVAtmos->SkyBox_SetTexture(texNightFront, texNightBack, texNightLeft, texNightRight, texNightUp, texNightDown);
        pTVAtmos->SkyBox_SetColor(1, 1, 1, 1);
		pTVAtmos->SkyBox_Render();
        pTVAtmos->SkyBox_SetTexture(texDayFront, texDayBack, texDayLeft, texDayRight, texDayUp, texDayDown);

        float fSunPositionY = float(SUN_ORBIT_RADIUS * sin(2 * M_PI * lTimeOfDay / MILLISEC_PER_DAY - M_PI * 0.5) + iSunOrbitYOffset);

        //Set the alpha according to the y position of the sun
        float  fAlpha = (fSunPositionY + SUN_ORBIT_RADIUS - iSunOrbitYOffset) / (SUN_ORBIT_RADIUS * 2);
        //strech the alpha 
        fAlpha *= 2;
        //alpha now ranges from 0 to 2, so cap it at 1 again
        //The purpose of this is to avoid stars being visible during the day (the brightness of the day sky is
        //consistant)
        if(fAlpha > 1)
            fAlpha = 1;
        
        pTVAtmos->SkyBox_SetColor(1, 1, 1, fAlpha);
		pTVAtmos->SkyBox_Render();
        pTVAtmos->Sun_SetPosition(float(SUN_ORBIT_RADIUS * cos(2 * M_PI * lTimeOfDay / MILLISEC_PER_DAY - M_PI * 0.5)), fSunPositionY, 0);

        pTVAtmos->SkyBox_Enable(false);
        pTVAtmos->Atmosphere_Render();

		cTV_LIGHT SunLight;
		pTVLights->GetLight(iIndiceSunlight,&SunLight);
        SunLight.direction = Vector3(float(-cos(2 * M_PI * lTimeOfDay / MILLISEC_PER_DAY - M_PI * 0.5)), float(-sin(2 * M_PI * lTimeOfDay / MILLISEC_PER_DAY - M_PI * 0.5)), 0);
        float fBrightness = float(1.0 / (1 + pow(M_E, -(fAlpha - 0.6) / 0.05)));
        float fAmbient  = fAlpha * 0.2F;

        SunLight.ambient.r = fAmbient;
        SunLight.ambient.g = fAmbient;
        SunLight.ambient.b = fAmbient;
        SunLight.ambient.a = fAmbient;
        SunLight.diffuse.r = fBrightness;
        SunLight.diffuse.g = fBrightness;
        SunLight.diffuse.b = fBrightness;
        SunLight.diffuse.a = fBrightness;
        SunLight.specular.r = fBrightness;
        SunLight.specular.g = fBrightness;
        SunLight.specular.b = fBrightness;
        SunLight.specular.a = fBrightness;
        pTVLights->SetLight(iIndiceSunlight, &SunLight);

}





CLWater::CLWater(void)
{
	pTVScene = new CTVScene();
	pTVTexFactory = new CTVTextureFactory();
	pTVGraphEffect = new CTVGraphicEffect();

	// Creates the reflection/refraction render surfaces, which will be used for water objects.
        pReflectRS = pTVScene->CreateRenderSurfaceEx(-1, -1, cTV_TEXTUREFORMAT_DEFAULT, true, true, 1);
        pReflectRS->SetBackgroundColor(RGBA(0, 0, 0.1906, 1));

        pRefractRS = pTVScene->CreateRenderSurfaceEx(-1, -1, cTV_TEXTUREFORMAT_DEFAULT, true, true, 1);
        pRefractRS->SetBackgroundColor(RGBA(0, 0, 0.1906, 1));

        int iDUDV = pTVTexFactory->LoadDUDVTexture("Media\\distortiontexture.dds", "DUDV", -1, -1, 150); //distortiontexture.dds

        pWaterMesh = pTVScene->CreateMeshBuilder("WaterMesh");
        WaterHeight = 85;
		pWaterMesh->AddFloor(iDUDV, -2048, -2048, 2048, 2048, WaterHeight, 16, 16, true);
		pWaterMesh->SetBlendingMode(cTV_BLEND_ALPHA,-1);

        pWaterPlane = new cTV_PLANE(cTV_3DVECTOR(0, 1, 0), -WaterHeight - 0.75f);// between .75 and like 1.3 are the best values
        pTVGraphEffect->SetWaterReflection(pWaterMesh, pReflectRS, pRefractRS, 0, pWaterPlane);
		pTVGraphEffect->SetWaterReflectionBumpAnimation(pWaterMesh,true,0.5,0.5);  //  les 1 sont la vitesse en x et y

}

CLWater::~CLWater(void)
{
}

void CLWater::StartReflectRender(void)
{
pReflectRS->StartRender();
}
void CLWater::StopReflectRender(void)
{
pReflectRS->EndRender();
}
void CLWater::StartRefractRender(void)
{
pRefractRS->StartRender();
}
void CLWater::StopRefractRender(void)
{
  pRefractRS->EndRender();
}

void CLWater::Render(void)
{
  pWaterMesh->Render();
}