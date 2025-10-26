#include "StdAfx.h"
#include "Speedo.h"

namespace GraphysX
{
	CLSpeedo::CLSpeedo()
	{}
	CLSpeedo::~CLSpeedo()
	{}
	float CLSpeedo::CalculateSpeed(cTV_3DVECTOR vActualPos, float fTimeElapsed)
	{
		if (firstLoop) vOldPos = vActualPos;
		cTV_3DVECTOR vSpeed = vActualPos - vOldPos;
		fSpeed = (pMath.VLength(&vSpeed) / fTimeElapsed) * 1000;
		vOldPos = vActualPos;
		return(fSpeed);
	}
}