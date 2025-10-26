#include "stdafx.h"
#include "Sky.h"

#include "TV3DMoteur.h"
#include "Clock.h"
#include "ResourceManager.h"

namespace GraphysX
{
	CLSky::CLSky()
	{
		
	}
	CLSky::~CLSky()
	{
	}
	STSkybox CLSky::loadSkybox(std::string folderName, bool bmp)
	{
		std::string type = ".jpg";
		if (bmp) type = ".bmp";

		STSkybox box;
		box.up = ResourceManager::getTexture("Sky\\" + folderName + "\\up" + type);
		box.down = ResourceManager::getTexture("Sky\\" + folderName + "\\down" + type);
		box.left = ResourceManager::getTexture("Sky\\" + folderName + "\\left" + type);
		box.right = ResourceManager::getTexture("Sky\\" + folderName + "\\right" + type);
		box.front = ResourceManager::getTexture("Sky\\" + folderName + "\\front" + type);
		box.back = ResourceManager::getTexture("Sky\\" + folderName + "\\back" + type);
		return box;
	}
	void CLSky::setDefaultSky()
	{
		// Default Skybox 
		/*
		texDayUp = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\up.jpg","DaySkyTop", -1, -1, cTV_COLORKEY_NO, true);
		texDayDown = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\down.jpg", "DaySkyBottom", -1, -1, cTV_COLORKEY_NO, true);
		texDayLeft = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\left.jpg", "DaySkyLeft", -1, -1, cTV_COLORKEY_NO, true);
		texDayRight = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\right.jpg", "DaySkyRight", -1, -1, cTV_COLORKEY_NO, true);
		texDayFront = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\front.jpg","DaySkyFront", -1, -1, cTV_COLORKEY_NO, true);
		texDayBack = pTVTexFactory->LoadTexture("media\\sky\\clearblue\\back.jpg", "DaySkyBack", -1, -1, cTV_COLORKEY_NO, true);
		*/
		setCurrentSky(&loadSkybox("LostValley", true), &loadSkybox("clearnight"));
		bDayNightEnable = true;
	
		texSun = ResourceManager::getTexture("Sky\\sun.jpg"); //  TODO : Devrait etre une classe Sun....
		CLTV3D::pTVAtmos.Sun_SetTexture(texSun);
		CLTV3D::pTVAtmos.Sun_SetBillboardSize(2);
		CLTV3D::pTVAtmos.Sun_Enable(true);

		iSunOrbitYOffset = 200;
		cTV_LIGHT SunLight;
		SunLight.type = cTV_LIGHT_DIRECTIONAL;
		SunLight.direction = Vector3(1.0, -1.0, 0);
		SunLight.ambient = TVColor(0.0, 0.0, 0.0, 1);
		SunLight.diffuse = TVColor(1.0, 1.0, 1.0, 1);
		SunLight.specular = TVColor(1.0, 1.0, 1.0, 1);
		SunLight.attenuation.x = 0;
		SunLight.attenuation.y = 0;
		SunLight.attenuation.z = 0;
		iIndiceSunlight = CLTV3D::pTVLightEngine.CreateLight(&SunLight, "sun");
		cTV_LIGHT MoonLight;
		MoonLight.type = cTV_LIGHT_DIRECTIONAL;
		MoonLight.direction = Vector3(1.0, -1.0, 0);
		MoonLight.ambient = TVColor(0.2f, 0.2f, 0.2f, 1);
		MoonLight.diffuse = TVColor(0.2f, 0.2f, 0.2f, 1);
		MoonLight.specular = TVColor(0.2f, 0.2f, 0.2f, 1);
		MoonLight.attenuation.x = 0;
		MoonLight.attenuation.y = 0;
		MoonLight.attenuation.z = 0;
		iIndiceMoonlight = CLTV3D::pTVLightEngine.CreateLight(&MoonLight, "moon");
	}

	void CLSky::setCurrentSky(STSkybox* day, STSkybox* night)
	{
		stSkyDay = *day;
		CLTV3D::pTVAtmos.SkyBox_SetTexture(stSkyDay.front, stSkyDay.back, stSkyDay.left, stSkyDay.right, stSkyDay.up, stSkyDay.down);
		
		if (night) stSkyNight = *night;
		CLTV3D::pTVAtmos.SkyBox_Enable(true);
	}
	void CLSky::UpdateRenderAtmos()  // must be within the render loop 
	{

		if (!bDayNightEnable)// TODO : diviser en section et inclure les nuage et l'eau et etc dans cette classe....
		{
			CLTV3D::pTVAtmos.SkyBox_Render();
		}
		else {
			long lTimeOfDay = GraphysX::CLClock::getTimeOfDay();
			CLTV3D::pTVAtmos.SkyBox_Enable(true);
			CLTV3D::pTVAtmos.SkyBox_SetTexture(stSkyNight.front, stSkyNight.back, stSkyNight.left, stSkyNight.right, stSkyNight.up, stSkyNight.down);
			CLTV3D::pTVAtmos.SkyBox_SetColor(1, 1, 1, 1);
			CLTV3D::pTVAtmos.SkyBox_Render();
			CLTV3D::pTVAtmos.SkyBox_SetTexture(stSkyDay.front, stSkyDay.back, stSkyDay.left, stSkyDay.right, stSkyDay.up, stSkyDay.down);

			float fSunPositionY = float(SUN_ORBIT_RADIUS * sin(2 * PI * lTimeOfDay / MILLISEC_PER_DAY - PI * 0.5) + iSunOrbitYOffset);

			//Set the alpha according to the y position of the sun
			float  fAlpha = (fSunPositionY + SUN_ORBIT_RADIUS - iSunOrbitYOffset) / (SUN_ORBIT_RADIUS * 2);
			//strech the alpha 
			fAlpha *= 2;
			//alpha now ranges from 0 to 2, so cap it at 1 again
			//The purpose of this is to avoid stars being visible during the day (the brightness of the day sky is
			//consistant)
			if (fAlpha > 1)
				fAlpha = 1;

			CLTV3D::pTVAtmos.SkyBox_SetColor(1, 1, 1, fAlpha);
			CLTV3D::pTVAtmos.SkyBox_Render();
			CLTV3D::pTVAtmos.Sun_SetPosition(float(SUN_ORBIT_RADIUS * cos(2 * PI * lTimeOfDay / MILLISEC_PER_DAY - PI * 0.5)), fSunPositionY, 0);

			CLTV3D::pTVAtmos.SkyBox_Enable(false);
			CLTV3D::pTVAtmos.Atmosphere_Render();

			cTV_LIGHT SunLight;
			CLTV3D::pTVLightEngine.GetLight(iIndiceSunlight, &SunLight);
			SunLight.direction = Vector3(float(-cos(2 * PI * lTimeOfDay / MILLISEC_PER_DAY - PI * 0.5)), float(-sin(2 * PI * lTimeOfDay / MILLISEC_PER_DAY - PI * 0.5)), 0);
			float fBrightness = float(1.0 / (1 + pow(M_E, -(fAlpha - 0.6) / 0.05)));
			float fAmbient = fAlpha * 0.2F;

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
			CLTV3D::pTVLightEngine.SetLight(iIndiceSunlight, &SunLight);
		}
	}
}