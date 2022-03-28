#pragma once

#define SUN_ORBIT_RADIUS 1000

struct STSkybox
	{
		int up, down, left, right, front, back; // Left = North, Right = South, Front = West, Back = East
	};

namespace GraphysX
{
	class CLSky
	{
	public:
		CLSky();
		~CLSky();

		void setDefaultSky();
		GRAPHYSX_API void setCurrentSky(STSkybox* day, STSkybox* night = nullptr);
		GRAPHYSX_API STSkybox loadSkybox(std::string folderName, bool bmp = false);
		

		int GetSunOrbitYOffset(void)        { return(iSunOrbitYOffset); }
		void SetSunOrbitYOffset(int Offset) { iSunOrbitYOffset = Offset; }
		void setDayNightEnable(bool state) { bDayNightEnable = state; }
		void UpdateRenderAtmos();
	private:
		int iIndiceSunlight, iIndiceMoonlight;  //These indices are store to avoid the lookup costs
		int iSunOrbitYOffset;
		int texSun;
		STSkybox stSkyDay, stSkyNight;
		bool bDayNightEnable = false;
	};

}