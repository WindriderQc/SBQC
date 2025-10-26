#pragma once
#include "StdAfx.h"
#include "Clock.h"

#define M_E        2.71828182845904523536
#define M_PI       3.14159265358979323846

#define SUN_ORBIT_RADIUS 1000


class CLAtmosphere
{
public:
	CLAtmosphere(void);
	~CLAtmosphere(void);

	//These indices are store to avoid the lookup costs
    int texDayUp,  texDayDown, texDayLeft, texDayRight, texDayFront, texDayBack;
    int texNightUp,  texNightDown, texNightLeft, texNightRight, texNightFront, texNightBack;
    int texSun;


	int GetSunOrbitYOffset(void);
	void SetSunOrbitYOffset(int Offset);
	void UpdateAndRender(float TimeElapsed);


	long lTimeOfDay;

//private:
public:
		CTVAtmosphere* pTVAtmos;
		CTVPhysics* pTVPhysics;
		CTVScene* pTVScene;
		CTVTextureFactory* pTVTexFactory; 
		CTVLightEngine* pTVLights;
		//CTVLandscape* pTVLand;
		

		CLClock* clClock;

		int iIndiceSunlight, iIndiceMoonlight;
		int iSunOrbitYOffset;
     
		int pNewtonLand;


};


class CLWater
{
public:
	CLWater(void);
	~CLWater(void);

		void StartReflectRender(void);
		void StopReflectRender(void);
		void StartRefractRender(void);
		void StopRefractRender(void);
		void Render(void);

protected:
		CTVScene* pTVScene;
		CTVTextureFactory* pTVTexFactory; 

		CTVGraphicEffect* pTVGraphEffect;
		CTVRenderSurface* pReflectRS; 
		CTVRenderSurface* pRefractRS;
		CTVMesh* pWaterMesh;
		cTV_PLANE* pWaterPlane;

		float WaterHeight;

};
