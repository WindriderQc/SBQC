#pragma once
#include "TV3DMoteur.h" 

namespace GraphysX
{
	class CLSpeedo
	{
	public:
		CLSpeedo();
		~CLSpeedo();
		float CalculateSpeed(cTV_3DVECTOR vActualPos, float fTimeElapsed);

	private:
		cTV_3DVECTOR vOldPos;
		CTVMathLibrary pMath;
		float fSpeed = 0.0f;
		bool firstLoop = true;
	};
}